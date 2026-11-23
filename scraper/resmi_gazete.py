import re
import datetime
from typing import List, Dict, Any, Optional
import httpx
from bs4 import BeautifulSoup
import fitz  # PyMuPDF

from scraper.config import get_supabase_client

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
    "istihdam",
    "alımı ilanı",
    "alım ilanı"
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
}

def is_target_announcement(title: str) -> bool:
    """Verilen ilanın başlığı hedeflenen kamu personel/memur alımlarıyla ilgili mi?"""
    lower_title = title.lower()
    return any(keyword in lower_title for keyword in TARGET_KEYWORDS)

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

def fetch_resmi_gazete_daily_links(target_date: Optional[datetime.date] = None) -> List[Dict[str, str]]:
    """
    Resmî Gazete Çeşitli İlanlar sayfasından hedeflenen personel alım ilanlarının linklerini çeker.
    """
    if target_date is None:
        target_date = datetime.date.today()

    date_str = target_date.strftime("%Y%m%d")
    year_str = target_date.strftime("%Y")
    month_str = target_date.strftime("%m")

    # Resmî Gazete Çeşitli İlanlar tipik URL yapısı
    possible_urls = [
        f"https://www.resmigazete.gov.tr/ilanlar/eskiilanlar/{year_str}/{month_str}/{date_str}-4.htm",
        f"https://www.resmigazete.gov.tr/ilanlar/eskiilanlar/{year_str}/{month_str}/{date_str}-3.htm",
        "https://www.resmigazete.gov.tr/"
    ]

    announcements_found = []
    
    with httpx.Client(timeout=30.0, headers=HEADERS, follow_redirects=True) as client:
        for url in possible_urls:
            try:
                print(f"[INFO] Resmî Gazete taranıyor: {url}")
                res = client.get(url)
                if res.status_code != 200:
                    continue

                soup = BeautifulSoup(res.content, "html.parser")
                links = soup.find_all("a", href=True)

                for link in links:
                    title = link.get_text(strip=True)
                    href = link["href"].strip()

                    if not title or len(title) < 8:
                        continue

                    # Personel / Memur anahtar kelimelerini filtrele
                    if is_target_announcement(title):
                        # Tam URL oluştur
                        if href.startswith("/"):
                            full_url = f"https://www.resmigazete.gov.tr{href}"
                        elif not href.startswith("http"):
                            base = url.rsplit("/", 1)[0]
                            full_url = f"{base}/{href}"
                        else:
                            full_url = href

                        announcements_found.append({
                            "title": title,
                            "url": full_url,
                            "source": "RESMI_GAZETE",
                            "date": target_date.isoformat()
                        })

                if announcements_found:
                    print(f"[BAŞARILI] {len(announcements_found)} adet hedef ilan tespit edildi.")
                    break

            except Exception as e:
                print(f"[HATA] {url} taranırken istisna oluştu: {e}")

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
                # Metni tablo yapısına sadık kalarak ayıkla
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
    soup = BeautifulSoup(html_bytes, "html.parser")
    # Script, style ve gezinme elemanlarını temizle
    for element in soup(["script", "style", "nav", "footer", "header", "noscript"]):
        element.decompose()

    text = soup.get_text(separator="\n", strip=True)
    return clean_raw_text(text)

def clean_raw_text(text: str) -> str:
    """Çoklu boşlukları, gereksiz satır sonlarını ve temizlik işlemlerini yapar."""
    # Ardışık boşluk ve tabları tek boşluğa çevir
    text = re.sub(r"[ \t]+", " ", text)
    # 3 veya daha fazla satır sonunu 2 satır sonuna indir
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()
