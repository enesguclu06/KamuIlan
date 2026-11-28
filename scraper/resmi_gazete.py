import re
import datetime
from typing import List, Dict, Optional
import httpx
from bs4 import BeautifulSoup
import fitz  # PyMuPDF

try:
    from scraper.config import get_supabase_client
except ImportError:
    from config import get_supabase_client

TARGET_KEYWORDS = [
    "personel alım",
    "memur alım",
    "sözleşmeli personel",
    "sürekli işçi",
    "işçi alım",
    "personel alımı",
    "memur alımı",
    "sözleşmeli",
    "mühendis",
    "avukat",
    "mimar",
    "şehir plancısı",
    "uzman yardımcısı",
    "müfettiş yardımcısı",
    "denetçi yardımcısı",
    "araştırma görevlisi",
    "öğretim görevlisi",
    "öğretim üyesi",
    "öğretim elemanı",
    "bilişim personeli",
    "zabıt kâtibi",
    "zabıt katibi",
    "infaz ve koruma",
    "koruma ve güvenlik",
    "özel güvenlik",
    "büro personeli",
    "destek personeli",
    "tekniker",
    "teknisyen",
    "hemşire",
    "ebe",
    "sağlık teknikeri",
    "sağlık memuru",
    "tabip",
    "zabıta memuru",
    "itfaiye eri",
    "kamu personeli",
    "giriş sınavı",
    "sınav ilanı",
    "alınacaktır",
    "alımı yapılacaktır",
    "kpss",
    "ales",
    "yds",
    "istihdam edilecektir",
]

EXCLUDE_INSTITUTION_PREFIXES = [
    "icra dairesi",
    "sulh hukuk",
    "asliye hukuk",
    "tüketici mahkemesi",
    "vergi dairesi",
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
}

def is_target_announcement(text: str) -> bool:
    """Verilen ilan metninin (veya başlığının) kamu personel/memur alımıyla ilgili olup olmadığını kontrol eder."""
    if not text:
        return False
    lower_text = text.lower()
    return any(keyword in lower_text for keyword in TARGET_KEYWORDS)

def is_likely_non_hr_link(title: str) -> bool:
    """Mahkeme tebligatı veya icra gibi bariz personel dışı linkleri önceden eler."""
    lower_title = title.lower()
    return any(prefix in lower_title for prefix in EXCLUDE_INSTITUTION_PREFIXES)

def get_existing_urls_from_supabase() -> set:
    """Kotayı korumak için veritabanında zaten kayıtlı olan ilan URL'lerini döner."""
    client = get_supabase_client()
    if not client:
        return set()
    try:
        response = client.table("announcements").select("source_url").execute()
        return {row["source_url"] for row in response.data}
    except Exception as e:
        print(f"[UYARI] Supabase URL sorgusunda hata: {e}")
        return set()

def fetch_resmi_gazete_daily_links(
    target_date: Optional[datetime.date] = None,
    days_back: int = 2
) -> List[Dict[str, str]]:
    """
    Resmî Gazete Çeşitli İlanlar sayfasından (bugün ve son `days_back` gün)
    tüm duyuru PDF/HTM linklerini çeker.
    NOT: Resmî Gazete link başlıkları yalnızca kurum adını içerdiğinden
    ('Rekabet Kurumu Başkanlığından:' gibi), personel alımı kontrolü PDF metni içinde yapılır.
    """
    if target_date is None:
        target_date = datetime.date.today()

    announcements_found = []
    seen_urls = set()

    with httpx.Client(timeout=30.0, headers=HEADERS, follow_redirects=True) as client:
        for offset in range(days_back + 1):
            current_date = target_date - datetime.timedelta(days=offset)
            date_str = current_date.strftime("%Y%m%d")
            year_str = current_date.strftime("%Y")
            month_str = current_date.strftime("%m")

            cesitli_url = f"https://www.resmigazete.gov.tr/ilanlar/eskiilanlar/{year_str}/{month_str}/{date_str}-4.htm"
            try:
                print(f"[INFO] Resmî Gazete Çeşitli İlanlar taranıyor: {cesitli_url}")
                res = client.get(cesitli_url)
                if res.status_code != 200:
                    print(f"[BİLGİ] {cesitli_url} henüz yayımlanmamış (HTTP {res.status_code}).")
                    continue

                # Resmî Gazete Çeşitli İlanlar genellikle windows-1254 kodlaması kullanır
                html_text = res.content.decode("windows-1254", errors="replace")
                soup = BeautifulSoup(html_text, "html.parser")
                links = soup.find_all("a", href=True)

                day_count = 0
                for link in links:
                    title = " ".join(link.get_text(strip=True).split())
                    href = link["href"].strip()

                    if not title or len(title) < 6:
                        continue
                    if not (href.lower().endswith(".pdf") or "-4-" in href.lower()):
                        continue
                    if is_likely_non_hr_link(title):
                        continue

                    if href.startswith("/"):
                        full_url = f"https://www.resmigazete.gov.tr{href}"
                    elif not href.startswith("http"):
                        base = cesitli_url.rsplit("/", 1)[0]
                        full_url = f"{base}/{href}"
                    else:
                        full_url = href

                    if full_url in seen_urls:
                        continue
                    seen_urls.add(full_url)

                    announcements_found.append({
                        "title": title,
                        "url": full_url,
                        "source": "RESMI_GAZETE",
                        "date": current_date.isoformat()
                    })
                    day_count += 1

                print(f"[BAŞARILI] {current_date.isoformat()} tarihinde {day_count} adet Çeşitli İlan linki bulundu.")

            except Exception as e:
                print(f"[HATA] {cesitli_url} taranırken istisna oluştu: {e}")

    return announcements_found

def extract_content_from_url(url: str) -> str:
    """
    Verilen URL'den metni ayıklar. Eğer PDF ise PyMuPDF (fitz) ile sayfaları okur,
    HTML ise BeautifulSoup ile temiz metni döner.
    """
    try:
        with httpx.Client(timeout=45.0, headers=HEADERS, follow_redirects=True) as client:
            res = client.get(url)
            res.raise_for_status()

            content_type = res.headers.get("content-type", "").lower()
            is_pdf = url.lower().endswith(".pdf") or "application/pdf" in content_type

            if is_pdf:
                return extract_text_from_pdf_bytes(res.content)
            else:
                return extract_text_from_html(res.content)
    except Exception as e:
        print(f"[HATA] URL içeriği alınamadı ({url}): {e}")
        return ""

def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> str:
    """PDF içeriğini sayfa sayfa okur, tablo ve metinleri optimize ederek birleştirir."""
    text_chunks = []
    try:
        with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
            total_pages = len(doc)
            print(f"[PDF] Toplam {total_pages} sayfa işleniyor...")

            for i in range(total_pages):
                page = doc[i]
                page_text = page.get_text("text")
                if page_text:
                    clean_page = clean_raw_text(page_text)
                    if clean_page:
                        text_chunks.append(f"--- [SAYFA {i+1}] ---\n{clean_page}")

        full_text = "\n\n".join(text_chunks)
        return full_text
    except Exception as e:
        print(f"[HATA] PDF ayrıştırma hatası: {e}")
        return ""

def extract_text_from_html(html_bytes: bytes) -> str:
    """HTML sayfalarındaki gereksiz tag'leri temizleyerek saf ilan metnini çıkarır."""
    decoded = html_bytes.decode("utf-8", errors="ignore")
    if "windows-1254" in decoded.lower() or "iso-8859-9" in decoded.lower():
        decoded = html_bytes.decode("windows-1254", errors="replace")

    soup = BeautifulSoup(decoded, "html.parser")
    for element in soup(["script", "style", "nav", "footer", "header", "noscript"]):
        element.decompose()

    text = soup.get_text(separator="\n", strip=True)
    return clean_raw_text(text)

def clean_raw_text(text: str) -> str:
    """Çoklu boşlukları, gereksiz satır sonlarını ve temizlik işlemlerini yapar."""
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()
