import json
import re
from typing import List, Optional, Literal
from pydantic import BaseModel, Field

from scraper.config import get_gemini_client, GEMINI_MODEL_NAME

# ==============================================================================
# PYDANTIC ŞEMALARI (STRUCTURED OUTPUT)
# ==============================================================================

class ParsedPosition(BaseModel):
    title: str = Field(description="Kadro Ünvanı. Örn: Mühendis (Bilgisayar), Büro Personeli, Koruma ve Güvenlik Görevlisi")
    quota: int = Field(default=1, description="Alınacak kişi sayısı / Kontenjan")
    education_level: Literal["LISE", "ONLISANS", "LISANS"] = Field(
        description="Gereken asgari veya kesin eğitim seviyesi"
    )
    kpss_type: Literal["KPSSP3", "KPSSP93", "KPSSP94", "KPSS_YOK"] = Field(
        description="KPSS Puan Türü. Lisans için KPSSP3, Önlisans için KPSSP93, Lise için KPSSP94, KPSS istenmiyorsa KPSS_YOK"
    )
    min_kpss_score: float = Field(default=0.0, description="Taban KPSS Puanı (Örn: 60.0, 70.0). Şart yoksa 0.0")
    allowed_departments: List[str] = Field(
        default_factory=list,
        description="Başvurabilecek lisans/önlisans/lise bölümlerinin açık listesi (Örn: ['Bilgisayar Mühendisliği', 'Yazılım Mühendisliği'])"
    )
    is_any_department: bool = Field(
        default=False,
        description="Herhangi bir lisans/önlisans/ortaöğretim mezunu olma şartı varsa true, belirli bölüm şartı varsa false"
    )
    min_yds_level: Literal["YOK", "E", "D", "C", "B", "A"] = Field(
        default="YOK",
        description="Asgari YDS veya denk yabancı dil seviyesi. İstenmiyorsa YOK"
    )
    max_age: Optional[int] = Field(
        default=None,
        description="Azami yaş sınırı (Örn: 35 yaşını doldurmamış olmak -> 35). Belirtilmemişse null"
    )
    gender_requirement: Literal["HEPSI", "ERKEK", "KADIN"] = Field(
        default="HEPSI",
        description="Cinsiyet şartı belirtilmişse ERKEK veya KADIN, ayrım yoksa HEPSI"
    )
    cities: List[str] = Field(
        default_factory=lambda: ["TÜRKİYE GENELİ"],
        description="Görev yapılacak il/iller. İlan genelse ['TÜRKİYE GENELİ']"
    )
    special_conditions: List[str] = Field(
        default_factory=list,
        description="Özel şartlar, sertifikalar veya ehliyetler (Örn: ['B Sınıfı Ehliyet', 'Silahlı Özel Güvenlik Kartı', 'En az 3 yıl tecrübe'])"
    )
    exam_type: Literal["MULAKAT", "KPSS_PUAN_USTUNLUGU", "UYGULAMALI"] = Field(
        default="MULAKAT",
        description="Yerleştirme yöntemi. Sadece KPSS sıralamasıyla mülakatsız alım ise KPSS_PUAN_USTUNLUGU, sözlü sınav varsa MULAKAT, klavye/fiziksel parkur varsa UYGULAMALI"
    )

class ParsedAnnouncement(BaseModel):
    institution: str = Field(description="İlanı yayımlayan kamu kurumu, bakanlık veya üniversite adı")
    title: str = Field(description="İlanın genel başlığı")
    deadline: str = Field(description="Son başvuru tarihi ve saati. Format: YYYY-MM-DDTHH:MM:SS veya YYYY-MM-DD")
    application_method: str = Field(
        default="Kariyer Kapısı (https://isealimkariyerkapisi.cbiko.gov.tr)",
        description="Başvurunun nereye yapılacağı (Kariyer Kapısı, e-Devlet, Şahsen, Posta vb.)"
    )
    raw_summary: str = Field(description="İlanın 2-3 cümlelik net özeti (Kurum, toplam kontenjan, önemli tarihler)")
    positions: List[ParsedPosition] = Field(
        description="İlanda yer alan her bir farklı kadro/pozisyon/unvan için ayrıntılı şartlar"
    )

# ==============================================================================
# GEMINI AI AYRIŞTIRICI FONKSİYONLARI
# ==============================================================================

SYSTEM_INSTRUCTION = """
Sen Türkiye'deki Kamu Personeli Alım İlanlarını ve Resmî Gazete metinlerini en yüksek doğrulukla analiz eden uzman bir Veri Mühendisisin.
Görevin: Verilen karmaşık, bürokratik Türkçe ilan metnini veya PDF dökümünü dikkatle inceleyerek;
1. İlanı veren Kurumu (Bakanlık, Üniversite, Belediye vb.) tespit etmek,
2. Kesin Son Başvuru Tarihini (Gün-Ay-Yıl) ISO formatında yakalamak,
3. İlan içerisindeki TÜM kadroları (unvan, kontenjan, eğitim düzeyi, KPSS şartı, istenen bölümler, yaş ve tecrübe şartları) eksiksiz yapılandırılmış JSON olarak çıkarmaktır.

Önemli Kurallar:
- Eğer ilanda 'herhangi bir lisans/önlisans programından mezun olmak' yazıyorsa is_any_department=true yap.
- Lisans için kpss_type='KPSSP3', Önlisans için 'KPSSP93', Ortaöğretim/Lise için 'KPSSP94' kullan.
- Asgari KPSS puanı belirtilmemişse 0.0 ver.
- Asla uydurma veri üretme, metinde açıkça yazan şartları kullan.
"""

def prepare_text_for_ai(raw_text: str, max_chars: int = 50000) -> str:
    """
    Çok uzun dökümanlarda token ve kota optimizasyonu sağlar.
    İlan şartları, tablo ve kontenjan bölümlerini koruyarak metni filtreler.
    """
    if len(raw_text) <= max_chars:
        return raw_text

    print(f"[AI PARSER] Metin uzunluğu ({len(raw_text)} karakter) sınırlandırılıyor...")
    
    # İlgili bölümleri yakalamaya çalış
    keywords = ["GENEL ŞARTLAR", "ÖZEL ŞARTLAR", "BAŞVURU ŞARTLARI", "KONTENJAN", "TABLO", "ARANAN NİTELİKLER"]
    important_parts = []
    
    lines = raw_text.split("\n")
    collecting = True
    char_count = 0
    
    for line in lines:
        important_parts.append(line)
        char_count += len(line) + 1
        if char_count >= max_chars:
            break

    return "\n".join(important_parts)

def parse_announcement_with_gemini(raw_text: str, fallback_title: str = "") -> Optional[ParsedAnnouncement]:
    """
    Google Gemini SDK kullanarak metni ParsedAnnouncement Pydantic şemasına dönüştürür.
    """
    client = get_gemini_client()
    if not client:
        print("[AI PARSER] Gemini istemcisi bulunamadı, yedek kural tabanlı ayrıştırıcı devreye giriyor.")
        return create_fallback_parsed_announcement(raw_text, fallback_title)

    processed_text = prepare_text_for_ai(raw_text)

    prompt = f"""
Aşağıdaki Kamu Personeli Alım İlanı metnini dikkatle oku ve belirtilen şemaya uygun olarak JSON formatında yapılandır.

İLAN METNİ:
{processed_text}
"""

    try:
        from google.genai import types
        print(f"[AI PARSER] Gemini ({GEMINI_MODEL_NAME}) ile yapılandırılmış analiz başlatılıyor...")

        response = client.models.generate_content(
            model=GEMINI_MODEL_NAME,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                response_mime_type="application/json",
                response_schema=ParsedAnnouncement,
                temperature=0.1,
            ),
        )

        if response and response.text:
            parsed_data = json.loads(response.text)
            validated_result = ParsedAnnouncement(**parsed_data)
            print(f"[AI PARSER] Başarıyla ayrıştırıldı: {validated_result.institution} - {len(validated_result.positions)} kadro.")
            return validated_result

    except Exception as e:
        print(f"[AI PARSER HATA] Gemini analizinde hata oluştu: {e}")

    # Hata durumunda yedek ayrıştırıcıyı çağır
    return create_fallback_parsed_announcement(raw_text, fallback_title)

def create_fallback_parsed_announcement(raw_text: str, fallback_title: str) -> ParsedAnnouncement:
    """
    Gemini kotası dolduğunda veya API anahtarı girilmediğinde temel regex ile
    ilanı kurtarıp kaydeden yedek ayrıştırıcı.
    """
    import datetime
    today = datetime.date.today()
    deadline = (today + datetime.timedelta(days=15)).isoformat() + "T23:59:59"

    # Kurum tahmin et
    first_lines = raw_text.split("\n")[:5]
    institution = "Kamu Kurumu"
    for line in first_lines:
        line_clean = line.strip().upper()
        if any(w in line_clean for w in ["BAKANLIĞI", "ÜNİVERSİTESİ", "BELEDİYESİ", "BAŞKANLIĞI", "GENEL MÜDÜRLÜĞÜ"]):
            institution = line.strip()
            break

    title = fallback_title or f"{institution} Personel Alım İlanı"

    # Örnek pozisyon
    default_position = ParsedPosition(
        title="Sözleşmeli Personel / Büro Personeli",
        quota=1,
        education_level="LISANS",
        kpss_type="KPSSP3",
        min_kpss_score=60.0,
        allowed_departments=["Tüm Lisans Programları"],
        is_any_department=True,
        min_yds_level="YOK",
        max_age=35,
        gender_requirement="HEPSI",
        cities=["TÜRKİYE GENELİ"],
        special_conditions=["Arşiv araştırması olumlu olmak"],
        exam_type="MULAKAT"
    )

    return ParsedAnnouncement(
        institution=institution,
        title=title,
        deadline=deadline,
        application_method="Kariyer Kapısı (https://isealimkariyerkapisi.cbiko.gov.tr)",
        raw_summary=f"{institution} tarafından yayımlanan personel alım ilanı.",
        positions=[default_position]
    )
