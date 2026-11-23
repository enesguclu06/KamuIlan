import os
from pathlib import Path
from dotenv import load_dotenv

# .env veya .env.local dosyasını kök dizinden yükle
root_dir = Path(__file__).resolve().parent.parent
load_dotenv(root_dir / ".env.local")
load_dotenv(root_dir / ".env")

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_BOT_USERNAME = os.getenv("TELEGRAM_BOT_USERNAME", "KamuIlanBot")
APP_URL = os.getenv("NEXT_PUBLIC_APP_URL", "http://localhost:3000")

# Model tercihi: gemini-2.5-flash (varsayılan) veya gemini-2.5-flash-lite
GEMINI_MODEL_NAME = os.getenv("GEMINI_MODEL_NAME", "gemini-2.5-flash")

def get_supabase_client():
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        print("[UYARI] SUPABASE_URL veya SUPABASE_SERVICE_ROLE_KEY tanımlanmamış. Yerel/simülasyon modunda çalışılacak.")
        return None
    from supabase import create_client, Client
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def get_gemini_client():
    if not GEMINI_API_KEY:
        print("[UYARI] GEMINI_API_KEY tanımlanmamış. AI ayrıştırma simülasyonu yapılacak.")
        return None
    from google import genai
    return genai.Client(api_key=GEMINI_API_KEY)
