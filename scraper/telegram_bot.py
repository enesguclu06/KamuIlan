"""
Telegram Bot Dinleyicisi (Chat ID Öğrenme ve Karşılama)
Kullanıcılar botunuza /start yazdığında onlara Chat ID'lerini otomatik yanıtlar.
Çalıştırmak için: python scraper/telegram_bot.py
"""

import time
import httpx
from scraper.config import TELEGRAM_BOT_TOKEN

def run_bot_listener():
    if not TELEGRAM_BOT_TOKEN:
        print("[HATA] TELEGRAM_BOT_TOKEN .env veya .env.local dosyasında tanımlı değil!")
        print("Lütfen BotFather'dan aldığınız token'ı .env.local içine yazın.")
        return

    print("=" * 60)
    print("🤖 Telegram Bot Dinleyicisi Başlatıldı!")
    print("Telegram uygulamanızdan botunuza /start yazabilirsiniz.")
    print("Durdurmak için: CTRL + C")
    print("=" * 60)

    last_update_id = 0
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"

    with httpx.Client(timeout=30.0) as client:
        # Bot bilgilerini al
        try:
            me = client.get(f"{url}/getMe").json()
            if me.get("ok"):
                print(f"[BAĞLANDI] Bot Adı: @{me['result'].get('username')}")
            else:
                print(f"[HATA] Token geçersiz: {me}")
                return
        except Exception as e:
            print(f"[HATA] Telegram API'ye erişilemedi: {e}")
            return

        while True:
            try:
                params = {"offset": last_update_id + 1, "timeout": 20}
                res = client.get(f"{url}/getUpdates", params=params)
                data = res.json()

                if data.get("ok"):
                    for update in data.get("result", []):
                        last_update_id = update["update_id"]
                        message = update.get("message")
                        if not message:
                            continue

                        chat_id = message["chat"]["id"]
                        user_name = message.get("from", {}).get("first_name", "Aday")
                        text = message.get("text", "")

                        print(f"[MESAJ ALINDI] Kullanıcı: {user_name} | Chat ID: {chat_id} | Mesaj: {text}")

                        reply_text = (
                            f"👋 <b>Merhaba {user_name}!</b>\n\n"
                            f"🎯 Senin Telegram <b>Chat ID</b> numaran:\n"
                            f"<code>{chat_id}</code>\n\n"
                            f"📌 Bu numarayı kopyalayıp <b>Kamuİlan Profil</b> sayfandaki "
                            f"Telegram Chat ID kutucuğuna yapıştırabilirsin. "
                            f"Sana uygun kamu ilanları çıktığında buraya anında bildirim alacaksın!"
                        )

                        client.post(f"{url}/sendMessage", json={
                            "chat_id": chat_id,
                            "text": reply_text,
                            "parse_mode": "HTML"
                        })

                time.sleep(1)
            except KeyboardInterrupt:
                print("\n[BİLGİ] Bot dinleyicisi durduruldu.")
                break
            except Exception as e:
                print(f"[UYARI] Döngü hatası: {e}")
                time.sleep(3)

if __name__ == "__main__":
    run_bot_listener()
