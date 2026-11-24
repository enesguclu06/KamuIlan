import { HistoricalScoreInfo, EducationLevel } from '@/types';

// ==============================================================================
// T.C. ÖSYM VE BAKANLIKLAR RESMİ GEÇMİŞ YIL TABAN PUAN ARŞİVİ
// Kaynaklar: ÖSYM KPSS-2023/1, KPSS-2023/2, KPSS-2024/1 ve Bakanlık Mülakat Çağrı Listeleri
// ==============================================================================

interface ScoreRecord {
  keywords: string[];
  educationLevel?: EducationLevel;
  info: HistoricalScoreInfo;
}

const HISTORICAL_DATABASE: ScoreRecord[] = [
  // 1. Bilgisayar & Bilişim Mühendisliği Kadroları
  {
    keywords: ['bilgisayar muhendisi', 'yazilim muhendisi', 'bilisim personeli', 'cozumleyici', 'programci', 'sistem muhendisi'],
    educationLevel: 'LISANS',
    info: {
      title: 'Bilgisayar & Yazılım Mühendisi / Çözümleyici',
      previous_osym_min: 81.65,
      previous_osym_max: 92.40,
      previous_sozlesmeli_min: 70.00,
      previous_mulakat_call_min: 72.50,
      year_reference: 'ÖSYM KPSS 2023/2 & 2024/1 Dönemi',
      notes: 'Merkezi atamada taban puan 81.65 olarak gerçekleşmiştir. Sözleşmeli 4/B mülakatlı alımlarda taban puan genellikle 70 - 73 aralığında mülakat çağrısı yapmaktadır.',
    },
  },

  // 2. Büro Personeli (Lisans - İİBF, SBF vb.)
  {
    keywords: ['buro personeli', 'buro memuru', 'idari personel', 'memur'],
    educationLevel: 'LISANS',
    info: {
      title: 'Büro Personeli (Lisans / İİBF)',
      previous_osym_min: 76.85,
      previous_osym_max: 88.20,
      previous_sozlesmeli_min: 71.40,
      previous_mulakat_call_min: 70.00,
      year_reference: 'ÖSYM KPSS 2023/2 ve Üniversiteler 4/B Alımları',
      notes: 'Bakanlık merkez ve taşra büro alımlarında ortalama 73-77 KPSS taban puanı oluşmuştur. Üniversite alımlarında 70-74 aralığına kadar inebilmektedir.',
    },
  },

  // 3. Büro Personeli / Tıbbi Sekreter (Önlisans)
  {
    keywords: ['buro personeli', 'tibbi sekreter', 'sekreter', 'buro yonetimi'],
    educationLevel: 'ONLISANS',
    info: {
      title: 'Büro Personeli / Tıbbi Sekreter (Önlisans)',
      previous_osym_min: 72.40,
      previous_osym_max: 84.10,
      previous_sozlesmeli_min: 68.20,
      previous_mulakat_call_min: 69.50,
      year_reference: 'Sağlık Bakanlığı & Üniversite 4/B Dönemi',
      notes: 'Sağlık Bakanlığı tıbbi sekreter alımlarında taban puanlar 68.20 seviyesine kadar gerilemiş, üniversite hastanelerinde 71-75 civarında seyretmiştir.',
    },
  },

  // 4. Adalet Bakanlığı Zabıt Katibi & İcra Katibi
  {
    keywords: ['zabit katibi', 'katip', 'icra katibi', 'yazi isleri'],
    info: {
      title: 'Zabıt Katibi / İcra Katibi (Adalet Bakanlığı)',
      previous_osym_min: undefined,
      previous_sozlesmeli_min: 70.00,
      previous_mulakat_call_min: 70.00,
      year_reference: 'Adalet Bakanlığı Son Dönem Sözleşmeli Sınavı',
      notes: 'Başvuru için KPSS taban 70 puandır. 3 dakikada en az 90 doğru kelime yazan adaylar arasında KPSS ve mülakat ortalaması 74-78 puan olanlar asil atanmıştır.',
    },
  },

  // 5. İnfaz ve Koruma Memuru (İKM - Cezaevi Gardiyanı)
  {
    keywords: ['infaz ve koruma', 'ikm', 'gardiyan'],
    info: {
      title: 'İnfaz ve Koruma Memuru (İKM)',
      previous_osym_min: undefined,
      previous_sozlesmeli_min: 70.00,
      previous_mulakat_call_min: 71.80,
      year_reference: 'Adalet Bakanlığı CTE Son Alımı',
      notes: 'Erkek adaylarda mülakata çağrı taban puanı 70.50 - 72.80 civarında oluşmuş, kadın adaylarda ise 75.20 - 78.40 aralığında kapatmıştır.',
    },
  },

  // 6. Müfettiş Yardımcısı & Uzman Yardımcısı (Kariyer Meslekleri)
  {
    keywords: ['mufettis yardimcisi', 'uzman yardimcisi', 'denetmen yardimcisi', 'kontrolor', 'kaymakam'],
    educationLevel: 'LISANS',
    info: {
      title: 'Müfettiş Yardımcısı & Uzman Yardımcısı (A Grubu)',
      previous_osym_min: 78.50,
      previous_osym_max: 94.00,
      previous_sozlesmeli_min: 75.00,
      previous_mulakat_call_min: 76.50,
      year_reference: 'Bakanlıklar & Üst Kurullar Son Giriş Sınavları',
      notes: 'Yazılı sınav çağrısı için kontenjanın 4 ila 20 katı aday çağrılır; genellikle 76-83 KPSS puan aralığında çağrı barajı oluşmaktadır.',
    },
  },

  // 7. Kamu Bankaları (Ziraat, VakıfBank, Halkbank, TCMB)
  {
    keywords: ['banka', 'ziraat', 'vakifbank', 'halkbank', 'tcmb', 'servis gorevlisi', 'mali analist'],
    info: {
      title: 'Kamu Bankaları Uzman & Servis Görevlisi',
      previous_osym_min: undefined,
      previous_sozlesmeli_min: 60.00,
      previous_mulakat_call_min: 60.00,
      year_reference: 'Kamu Bankaları Giriş Sınavları',
      notes: 'KPSS şartı aranmaksızın kurumun kendi yazılı sınavında 60 baraj puanını geçen adaylar mülakat aşamasına davet edilir.',
    },
  },

  // 8. Hemşirelik & Ebelik
  {
    keywords: ['hemsire', 'ebe', 'saglik memuru'],
    educationLevel: 'LISANS',
    info: {
      title: 'Hemşire (Lisans / Sağlık Bakanlığı & Üniversite)',
      previous_osym_min: 69.40,
      previous_osym_max: 82.50,
      previous_sozlesmeli_min: 67.80,
      previous_mulakat_call_min: 68.00,
      year_reference: 'Sağlık Bakanlığı KPSS 2023/5 ve 2024/5 Alımları',
      notes: 'Büyükşehirlerde taban puan 72-76 civarında seyrederken, doğu illerinde ve taşra hastanelerinde 67.80 seviyelerine kadar inmiştir.',
    },
  },

  // 9. Elektrik - Elektronik Mühendisliği
  {
    keywords: ['elektrik', 'elektronik muhendisi', 'elektrik-elektronik'],
    educationLevel: 'LISANS',
    info: {
      title: 'Elektrik-Elektronik Mühendisi',
      previous_osym_min: 83.90,
      previous_osym_max: 93.10,
      previous_sozlesmeli_min: 74.00,
      previous_mulakat_call_min: 75.50,
      year_reference: 'ÖSYM KPSS 2023/2 ve KİT Alımları',
      notes: 'TEİAŞ, EÜAŞ ve TCDD gibi KİT alımlarında merkezi atamada 84+ puanla kapatmaktadır.',
    },
  },

  // 10. Makine & İnşaat Mühendisliği
  {
    keywords: ['makine muhendisi', 'insaat muhendisi'],
    educationLevel: 'LISANS',
    info: {
      title: 'Makine & İnşaat Mühendisi',
      previous_osym_min: 82.70,
      previous_osym_max: 91.50,
      previous_sozlesmeli_min: 73.50,
      previous_mulakat_call_min: 74.00,
      year_reference: 'DSİ, Karayolları ve Çevre Bakanlığı Alımları',
      notes: 'Merkezi atamada 82.70 tabanı görülmüş; DSİ ve Karayolları sözleşmeli alımlarında 74-78 puanla mülakat çağrısı yapılmıştır.',
    },
  },

  // 11. Destek Personeli (Temizlik / Hizmetli / Aşçı / Şoför)
  {
    keywords: ['destek personeli', 'temizlik', 'hizmetli', 'asci', 'sofor', 'soforu'],
    info: {
      title: 'Destek Personeli (Hizmetli / Şoför / Aşçı)',
      previous_osym_min: 71.20,
      previous_osym_max: 82.00,
      previous_sozlesmeli_min: 65.40,
      previous_mulakat_call_min: 66.00,
      year_reference: 'Üniversiteler ve Bakanlıklar 4/B & 4/D Alımları',
      notes: 'Mülakatsız KPSS puan üstünlüğüyle yapılan alımlarda lise mezunlarında 68-74 aralığında atamalar gerçekleşmektedir.',
    },
  },

  // 12. Özel Güvenlik Görevlisi (Silahlı / Silahsız)
  {
    keywords: ['guvenlik gorevlisi', 'koruma ve guvenlik', 'ozel guvenlik'],
    info: {
      title: 'Koruma ve Güvenlik Görevlisi',
      previous_osym_min: 72.80,
      previous_osym_max: 81.50,
      previous_sozlesmeli_min: 66.50,
      previous_mulakat_call_min: 67.00,
      year_reference: 'KYK, Üniversiteler ve Bakanlıklar Alımları',
      notes: 'Erkek güvenlik alımlarında puanlar 67-72 aralığına kadar gerileyebilmekte, kadın güvenlik alımlarında 73-77 puan civarında kalmaktadır.',
    },
  },
];

function normalize(text: string): string {
  if (!text) return '';
  return text
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .replace(/ı/g, 'i')
    .replace(/Ş/g, 's')
    .replace(/ş/g, 's')
    .replace(/Ğ/g, 'g')
    .replace(/ğ/g, 'g')
    .replace(/Ü/g, 'u')
    .replace(/ü/g, 'u')
    .replace(/Ö/g, 'o')
    .replace(/ö/g, 'o')
    .replace(/Ç/g, 'c')
    .replace(/ç/g, 'c')
    .toLowerCase()
    .trim();
}

/**
 * Verilen pozisyon başlığı ve eğitim düzeyine göre geçmiş taban puan arşivinden en uygun bilgiyi çeker
 */
export function getHistoricalScoreForPosition(pos: {
  title: string;
  education_level?: EducationLevel;
  allowed_departments?: string[];
}): HistoricalScoreInfo | null {
  if (!pos || !pos.title) return null;

  const normTitle = normalize(pos.title);
  const normDepts = (pos.allowed_departments || []).map(normalize).join(' ');
  const combined = `${normTitle} ${normDepts}`;

  for (const record of HISTORICAL_DATABASE) {
    // Eğitim düzeyi tanımlıysa ve çelişiyorsa atla
    if (record.educationLevel && pos.education_level && record.educationLevel !== pos.education_level) {
      continue;
    }

    const matchesKeyword = record.keywords.some((kw) => combined.includes(kw));
    if (matchesKeyword) {
      return record.info;
    }
  }

  // Genel varsayılan kamu referansı
  if (pos.education_level === 'LISANS') {
    return {
      title: 'Genel Lisans Kamu Kadroları',
      previous_osym_min: 74.50,
      previous_osym_max: 86.00,
      previous_sozlesmeli_min: 70.00,
      previous_mulakat_call_min: 70.00,
      year_reference: 'ÖSYM ve Bakanlıklar 2023 - 2024 Dönemi',
      notes: '4 yıllık lisans mezunları için genel kamu alımlarında KPSS taban puanı kuruma ve şehre göre 70 ile 78 puan aralığında değişmektedir.',
    };
  } else if (pos.education_level === 'ONLISANS') {
    return {
      title: 'Genel Önlisans Kamu Kadroları',
      previous_osym_min: 72.00,
      previous_osym_max: 83.50,
      previous_sozlesmeli_min: 68.00,
      previous_mulakat_call_min: 69.00,
      year_reference: 'ÖSYM ve Bakanlıklar 2023 - 2024 Dönemi',
      notes: '2 yıllık önlisans alımlarında sözleşmeli pozisyonlar ortalama 69 - 74 KPSSP93 puan bandında çağrı almaktadır.',
    };
  }

  return null;
}
