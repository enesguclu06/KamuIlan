import time
from typing import Dict, Any, List
import httpx

from scraper.config import (
    TELEGRAM_BOT_TOKEN,
    APP_URL,
    get_supabase_client
)
from scraper.matcher import evaluate_match

def send_telegram_message(chat_id: str, html_message: str) -> bool:
    """Telegram Bot API üzerinden tekil bir kullanıcıya HTML formatlı bildirim gönderir."""
    if not TELEGRAM_BOT_TOKEN or not chat_id:
        return False

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": html_message,
        "parse_mode": "HTML",
        "disable_web_page_preview": False
    }

    try:
        with httpx.Client(timeout=10.0) as client:
            res = client.post(url, json=payload)
            if res.status_code == 200:
                return True
            elif res.status_code == 429:
                retry_after = res.json().get("parameters", {}).get("retry_after", 2)
                time.sleep(retry_after)
                retry_res = client.post(url, json=payload)
                return retry_res.status_code == 200
            else:
                print(f"[TELEGRAM HATA] Gönderilemedi ({chat_id}): {res.text}")
                return False
    except Exception as e:
        print(f"[TELEGRAM HATA] İstisna oluştu: {e}")
        return False

def format_telegram_alert(
    user_name: str,
    announcement: Dict[str, Any],
    matching_positions: List[Dict[str, Any]],
    announcement_id: str
) -> str:
    """Kullanıcıya özel zengin Telegram bildirim metni hazırlar."""
    institution = announcement.get("institution", "Kamu Kurumu")
    title = announcement.get("title", "Personel Alımı")
    deadline = str(announcement.get("deadline", "")).split("T")[0]
    app_method = announcement.get("application_method", "Kariyer Kapısı")

    position_lines = []
    for pos in matching_positions[:5]: # En fazla 5 kadroyu sığdır
        p_title = pos.get("title", "Kadro")
        quota = pos.get("quota", 1)
        kpss_info = f"{pos.get('kpss_type', 'KPSS')} (Min: {pos.get('min_kpss_score', 0)})" if pos.get('kpss_type') != 'KPSS_YOK' else "KPSS Şartsız"
        exam = pos.get("exam_type", "MULAKAT")
        exam_badge = "Mülakatsız (Puan Üstünlüğü)" if exam == "KPSS_PUAN_USTUNLUGU" else ("Uygulamalı Sınav" if exam == "UYGULAMALI" else "Sözlü Sınav / Mülakat")

        position_lines.append(
            f"• <b>{p_title}</b> (<b>{quota}</b> Kişi)\n"
            f"   └ <i>{kpss_info} | {exam_badge}</i>"
        )

    pos_text = "\n".join(position_lines)
    detail_url = f"{APP_URL}/ilan/{announcement_id}"

    message = (
        f"🎯 <b>YENİ UYGUN KAMU İLANI TESPİT EDİLDİ!</b>\n\n"
        f"👤 <b>Sayın {user_name or 'Aday'},</b>\n"
        f"Profil kriterlerinizle <b>%100 eşleşen</b> yeni bir kamu alımı yayımlandı:\n\n"
        f"🏛 <b>Kurum:</b> {institution}\n"
        f"📋 <b>İlan:</b> {title}\n"
        f"⏳ <b>Son Başvuru:</b> {deadline}\n\n"
        f"💼 <b>Sizin İçin Uygun Kadrolar:</b>\n"
        f"{pos_text}\n\n"
        f"📝 <b>Başvuru Yöntemi:</b> {app_method}\n"
        f"👉 <a href='{detail_url}'>İlan Detayını ve Şart Karşılaştırmasını Gör</a>"
    )
    return message

def notify_users_for_announcement(announcement: Dict[str, Any], positions: List[Dict[str, Any]], announcement_id: str) -> int:
    """
    Eklenen bir ilandaki kadroları aktif kullanıcılarla eşleştirip Telegram üzerinden uyarır.
    Dönen değer: Bildirim gönderilen başarılı kullanıcı sayısı.
    """
    supabase = get_supabase_client()
    if not supabase:
        print("[NOTIFIER] Supabase istemcisi yok, bildirim gönderimi atlanıyor.")
        return 0

    try:
        # Bildirim izni açık ve telegram_chat_id'si olan kullanıcıları çek
        response = supabase.table("user_profiles")\
            .select("*")\
            .eq("notify_enabled", True)\
            .not_.is_("telegram_chat_id", "null")\
            .execute()

        users = response.data or []
        if not users:
            print("[NOTIFIER] Bildirim bekleyen aktif kullanıcı bulunamadı.")
            return 0

        notified_count = 0
        print(f"[NOTIFIER] {len(users)} kayıtlı aday profili taranıyor...")

        for user in users:
            chat_id = user.get("telegram_chat_id")
            if not chat_id:
                continue

            matching_positions = []
            for pos in positions:
                status, _ = evaluate_match(user, pos, str(announcement.get("deadline", "")))
                if status == "UYGUN":
                    matching_positions.append(pos)

            if matching_positions:
                user_name = user.get("full_name") or "Aday"
                msg = format_telegram_alert(user_name, announcement, matching_positions, announcement_id)
                success = send_telegram_message(chat_id, msg)
                if success:
                    notified_count += 1
                    time.sleep(0.08) # Telegram rate-limit koruması

        print(f"[NOTIFIER] Toplam {notified_count} kullanıcıya anlık Telegram bildirimi ulaştırıldı.")
        return notified_count

    except Exception as e:
        print(f"[NOTIFIER HATA] Bildirim motoru çalışırken hata oluştu: {e}")
        return 0
