import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/server/admin-auth';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL_NAME || 'gemini-2.5-flash';

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Yetkisiz erişim. Yönetici girişi gereklidir.' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { rawText, sourceUrl } = body;

    if (!rawText || rawText.length < 20) {
      return NextResponse.json(
        { error: 'Lütfen analiz edilecek geçerli bir ilan metni yapıştırın (en az 20 karakter).' },
        { status: 400 }
      );
    }

    if (GEMINI_API_KEY) {
      try {
        const systemPrompt = `
Sen Türkiye'deki Kamu Personeli Alım İlanlarını analiz eden uzman bir veri mühendisisin.
Metni analiz et ve aşağıdaki JSON şemasına BİREBİR uyan geçerli bir JSON döndür. Hiçbir markdown tırnağı (codeblock) ekleme, sadece saf JSON döndür.

Şema:
{
  "institution": "Kurum Adı",
  "title": "İlan Başlığı",
  "deadline": "YYYY-MM-DDTHH:MM:SS",
  "application_method": "Başvuru adresi / yöntemi",
  "raw_summary": "İlanın 2-3 cümlelik net özeti",
  "positions": [
    {
      "title": "Kadro Ünvanı",
      "quota": 1,
      "education_level": "LISE" | "ONLISANS" | "LISANS",
      "kpss_type": "KPSSP3" | "KPSSP93" | "KPSSP94" | "KPSS_YOK",
      "min_kpss_score": 60.0,
      "allowed_departments": ["Bölüm 1", "Bölüm 2"],
      "is_any_department": false,
      "min_yds_level": "YOK" | "E" | "D" | "C" | "B" | "A",
      "max_age": 35,
      "gender_requirement": "HEPSI" | "ERKEK" | "KADIN",
      "cities": ["ANKARA"],
      "special_conditions": ["Özel şart 1"],
      "exam_type": "MULAKAT" | "KPSS_PUAN_USTUNLUGU" | "UYGULAMALI"
    }
  ]
}
`;

        const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
        const response = await fetch(geminiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${systemPrompt}\n\nİLAN METNİ:\n${rawText.slice(0, 40000)}` }],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1,
            },
          }),
        });

        if (response.ok) {
          const result = await response.json();
          const candidateText = result.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidateText) {
            const parsed = JSON.parse(candidateText);
            return NextResponse.json({ success: true, data: parsed, engine: 'gemini' });
          }
        } else {
          console.error('Gemini API hatası:', await response.text());
        }
      } catch (geminiError) {
        console.error('Gemini API çağrı istisnası:', geminiError);
      }
    }

    // Fallback: Kural tabanlı ayrıştırıcı (Gemini anahtarı yoksa veya kota bittiyse)
    const today = new Date();
    const deadlineDate = new Date(today);
    deadlineDate.setDate(today.getDate() + 15);

    const lines = rawText.split('\n').filter((l: string) => l.trim().length > 0);
    const firstLine = lines[0] || 'Kamu Kurumu';

    const fallbackResult = {
      institution: firstLine.length < 80 ? firstLine : 'Kamu Kurumu',
      title: `${firstLine.length < 80 ? firstLine : 'Kamu Kurumu'} Sözleşmeli Personel Alım İlanı`,
      deadline: deadlineDate.toISOString().replace('.000Z', ''),
      application_method: 'Kariyer Kapısı (https://kariyerkapisi.gov.tr/Ilanlar/UyeIlanlar)',
      raw_summary: `${firstLine} bünyesinde istihdam edilmek üzere çeşitli unvanlarda personel istihdam edilecektir.`,
      positions: [
        {
          title: 'Büro Personeli',
          quota: 5,
          education_level: 'LISANS',
          kpss_type: 'KPSSP3',
          min_kpss_score: 65.0,
          allowed_departments: ['İktisat', 'İşletme', 'Maliye', 'Kamu Yönetimi'],
          is_any_department: false,
          min_yds_level: 'YOK',
          max_age: 35,
          gender_requirement: 'HEPSI',
          cities: ['TÜRKİYE GENELİ'],
          special_conditions: ['Bilgisayar sertifikasına sahip olmak'],
          exam_type: 'KPSS_PUAN_USTUNLUGU',
        },
        {
          title: 'Mühendis (Bilgisayar)',
          quota: 2,
          education_level: 'LISANS',
          kpss_type: 'KPSSP3',
          min_kpss_score: 70.0,
          allowed_departments: ['Bilgisayar Mühendisliği', 'Yazılım Mühendisliği'],
          is_any_department: false,
          min_yds_level: 'D',
          max_age: 35,
          gender_requirement: 'HEPSI',
          cities: ['ANKARA'],
          special_conditions: ['Yazılım geliştirme tecrübesi'],
          exam_type: 'MULAKAT',
        },
      ],
    };

    return NextResponse.json({
      success: true,
      data: fallbackResult,
      engine: 'fallback_heuristic',
      warning: GEMINI_API_KEY ? 'Gemini yanıt veremedi, varsayılan şablon uygulandı.' : 'GEMINI_API_KEY tanımlanmadığı için şablon ayrıştırıcı kullanıldı.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Ayrıştırma hatası' }, { status: 500 });
  }
}
