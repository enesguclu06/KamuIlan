import os
import sys

# Ensure repository root is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import argparse
import datetime
from typing import Optional

from scraper.config import get_supabase_client
from scraper.resmi_gazete import (
    fetch_resmi_gazete_daily_links,
    extract_content_from_url,
    get_existing_urls_from_supabase
)
from scraper.ai_parser import parse_announcement_with_gemini
from scraper.notifier import notify_users_for_announcement

def save_announcement_to_supabase(parsed, source_url: str, source: str = "RESMI_GAZETE") -> Optional[str]:
    """Ayrıştırılmış ilanı ve pozisyonlarını Supabase veritabanına kaydeder."""
    supabase = get_supabase_client()
    if not supabase:
        print("[DB] Supabase bağlantısı yok, kayıt işlemi atlanıyor.")
        return None

    try:
        # 1. Ana İlanı Ekle
        announcement_payload = {
            "source": source,
            "source_url": source_url,
            "institution": parsed.institution,
            "title": parsed.title,
            "publish_date": datetime.date.today().isoformat(),
            "deadline": parsed.deadline,
            "application_method": parsed.application_method,
            "raw_summary": parsed.raw_summary,
            "is_active": True
        }

        res = supabase.table("announcements").insert(announcement_payload).execute()
        if not res.data:
            print(f"[DB HATA] İlan eklenemedi: {parsed.title}")
            return None

        announcement_id = res.data[0]["id"]
        print(f"[DB BAŞARILI] İlan kaydedildi: ID={announcement_id}")

        # 2. Kadroları (Positions) Ekle
        positions_payload = []
        for pos in parsed.positions:
            positions_payload.append({
                "announcement_id": announcement_id,
                "title": pos.title,
                "quota": pos.quota,
                "education_level": pos.education_level,
                "kpss_type": pos.kpss_type,
                "min_kpss_score": pos.min_kpss_score,
                "allowed_departments": pos.allowed_departments,
                "is_any_department": pos.is_any_department,
                "min_yds_level": pos.min_yds_level,
                "max_age": pos.max_age,
                "gender_requirement": pos.gender_requirement,
                "cities": pos.cities,
                "special_conditions": pos.special_conditions,
                "exam_type": pos.exam_type
            })

        if positions_payload:
            supabase.table("positions").insert(positions_payload).execute()
            print(f"[DB BAŞARILI] {len(positions_payload)} kadro pozisyonu kaydedildi.")

        return announcement_id

    except Exception as e:
        print(f"[DB HATA] Veritabanı kaydı sırasında hata: {e}")
        return None

def run_scraper(limit: int = 10, dry_run: bool = False, custom_url: Optional[str] = None):
    print("=" * 70)
    print("🚀 KAMU İLAN TAKİP - RESMÎ GAZETE & AI AYRIŞTIRMA PIPELINE")
    print(f"⏰ Çalışma Zamanı: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

    # Özel URL testi verilmişse doğrudan onu tara
    if custom_url:
        print(f"[MOD] Tekil URL Testi: {custom_url}")
        content = extract_content_from_url(custom_url)
        if not content:
            print("[HATA] İçerik çekilemedi!")
            return
        parsed = parse_announcement_with_gemini(content, fallback_title="Test İlanı")
        print("\n--- AYRIŞTIRILAN VERİ ÖNİZLEMESİ ---")
        print(parsed.model_dump_json(indent=2))
        return

    # 1. Zaten taranmış URL'leri al (Gemini API kotasını koru!)
    existing_urls = get_existing_urls_from_supabase()
    print(f"[INFO] Veritabanında {len(existing_urls)} mevcut ilan URL'si kayıtlı.")

    # 2. Resmî Gazete'den bugünkü hedef ilanları bul
    daily_items = fetch_resmi_gazete_daily_links()
    if not daily_items:
        print("[BİLGİ] Bugün için yeni personel alım ilanı bulunamadı veya henüz yayımlanmadı.")
        return

    # 3. Mükerrerleri filtrele
    new_items = [item for item in daily_items if item["url"] not in existing_urls]
    print(f"[INFO] Taranacak YENİ ilan sayısı: {len(new_items)} (Toplam tespit edilen: {len(daily_items)})")

    if not new_items:
        print("[BİLGİ] Yeni ilan yok, tüm ilanlar zaten daha önce işlenmiş.")
        return

    processed_count = 0
    notified_total = 0

    for item in new_items[:limit]:
        title = item["title"]
        url = item["url"]
        print(f"\n[{processed_count + 1}/{min(len(new_items), limit)}] İşleniyor: {title}")
        print(f"    Link: {url}")

        raw_content = extract_content_from_url(url)
        if not raw_content or len(raw_content) < 50:
            print("    [ATLANDI] Yetersiz veya boş içerik.")
            continue

        parsed = parse_announcement_with_gemini(raw_content, fallback_title=title)
        if not parsed:
            print("    [ATLANDI] İlan ayrıştırılamadı.")
            continue

        if dry_run:
            print("    [DRY RUN] Kayıt ve bildirim atlandı. Ayrıştırılan kadro sayısı:", len(parsed.positions))
        else:
            announcement_id = save_announcement_to_supabase(parsed, source_url=url, source="RESMI_GAZETE")
            if announcement_id:
                positions_dict = [p.model_dump() for p in parsed.positions]
                announcement_dict = parsed.model_dump()
                notified = notify_users_for_announcement(announcement_dict, positions_dict, announcement_id)
                notified_total += notified

        processed_count += 1

    print("\n" + "=" * 70)
    print(f"✅ İŞLEM TAMAMLANDI! {processed_count} yeni ilan işlendi, {notified_total} adaya bildirim gönderildi.")
    print("=" * 70)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Kamu İlan Takip Scraper")
    parser.add_argument("--limit", type=int, default=10, help="Maksimum taranacak yeni ilan sayısı")
    parser.add_argument("--dry-run", action="store_true", help="Veritabanına kaydetmeden ve bildirim atmadan çalıştır")
    parser.add_argument("--url", type=str, default=None, help="Doğrudan belirli bir ilan linkini test et")
    args = parser.parse_args()

    run_scraper(limit=args.limit, dry_run=args.dry_run, custom_url=args.url)
