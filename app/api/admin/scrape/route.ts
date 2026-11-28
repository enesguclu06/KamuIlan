import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { SAMPLE_ANNOUNCEMENTS } from '@/lib/sample-data';
import { isAdminAuthorized } from '@/lib/server/admin-auth';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL_NAME || 'gemini-2.5-flash';

function sanitizePositionForSchema(p: any, announcementId: string) {
  const validEdu = ['LISE', 'ONLISANS', 'LISANS'];
  const safeEdu = validEdu.includes(p.education_level)
    ? p.education_level
    : p.education_level === 'YUKSEK_LISANS'
      ? 'LISANS'
      : 'LISANS';

  const validKpss = ['KPSSP3', 'KPSSP93', 'KPSSP94', 'KPSS_YOK'];
  const safeKpss = validKpss.includes(p.kpss_type) ? p.kpss_type : 'KPSSP3';

  const validExam = ['MULAKAT', 'KPSS_PUAN_USTUNLUGU', 'UYGULAMALI'];
  const safeExam = validExam.includes(p.exam_type) ? p.exam_type : 'MULAKAT';

  const validYds = ['YOK', 'E', 'D', 'C', 'B', 'A'];
  const safeYds = validYds.includes(p.min_yds_level) ? p.min_yds_level : 'YOK';

  const validGender = ['HEPSI', 'ERKEK', 'KADIN'];
  const safeGender = validGender.includes(p.gender_requirement) ? p.gender_requirement : 'HEPSI';

  return {
    announcement_id: announcementId,
    title: p.title || 'Personel',
    quota: Math.max(1, Number(p.quota) || 1),
    education_level: safeEdu,
    kpss_type: safeKpss,
    min_kpss_score: Math.min(100, Math.max(0, Number(p.min_kpss_score) || 0)),
    min_ales_score: p.min_ales_score ?? null,
    ales_type: p.ales_type ?? null,
    allowed_departments: Array.isArray(p.allowed_departments) ? p.allowed_departments : [],
    is_any_department: Boolean(p.is_any_department),
    min_yds_level: safeYds,
    min_yds_score: p.min_yds_score ?? null,
    max_age: p.max_age && p.max_age >= 18 && p.max_age <= 70 ? p.max_age : null,
    gender_requirement: safeGender,
    cities: Array.isArray(p.cities) && p.cities.length > 0 ? p.cities : ['TÜRKİYE GENELİ'],
    special_conditions: Array.isArray(p.special_conditions) ? p.special_conditions : [],
    exam_type: safeExam,
  };
}

async function fetchLiveResmiGazeteLinks(daysBack = 1): Promise<Array<{ title: string; url: string; date: string }>> {
  const results: Array<{ title: string; url: string; date: string }> = [];
  const seen = new Set<string>();
  const now = new Date();

  for (let offset = 0; offset <= daysBack; offset++) {
    const d = new Date(now);
    d.setDate(now.getDate() - offset);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const pageUrl = `https://www.resmigazete.gov.tr/ilanlar/eskiilanlar/${yyyy}/${mm}/${yyyy}${mm}${dd}-4.htm`;

    try {
      const res = await fetch(pageUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        cache: 'no-store',
      });
      if (!res.ok) continue;
      const buf = await res.arrayBuffer();
      const html = new TextDecoder('windows-1254').decode(buf);
      const matches = Array.from(html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi));

      for (const m of matches) {
        const href = m[1].trim();
        const title = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        if (!title || !href.toLowerCase().endsWith('.pdf')) continue;

        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes('icra dairesi') || lowerTitle.includes('sulh hukuk') || lowerTitle.includes('vergi dairesi')) {
          continue;
        }

        const fullUrl = href.startsWith('http')
          ? href
          : href.startsWith('/')
            ? `https://www.resmigazete.gov.tr${href}`
            : `https://www.resmigazete.gov.tr/ilanlar/eskiilanlar/${yyyy}/${mm}/${href}`;

        if (seen.has(fullUrl)) continue;
        seen.add(fullUrl);
        results.push({ title, url: fullUrl, date: `${yyyy}-${mm}-${dd}` });
      }
    } catch (e) {
      console.warn(`Resmî Gazete çekme hatası (${pageUrl}):`, e);
    }
  }

  return results;
}

async function analyzeResmiGazetePdfWithGemini(pdfUrl: string, linkTitle: string) {
  if (!GEMINI_API_KEY) return null;
  try {
    const pdfRes = await fetch(pdfUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!pdfRes.ok) return null;
    const arrayBuf = await pdfRes.arrayBuffer();
    if (arrayBuf.byteLength > 6 * 1024 * 1024) return null; // 6 MB üstü PDF'lerde limiti aşma

    const base64Pdf = Buffer.from(arrayBuf).toString('base64');
    const prompt = `
Bu Resmî Gazete PDF belgesini incele.
1) Bu belge bir KAMU PERSONELİ / MEMUR / SÖZLEŞMELİ / İŞÇİ / UZMAN YARDIMCISI / AKADEMİK PERSONEL ALIMI İLANI mı?
   (Eğer ihale, düzeltme, yönetmelik, kayıp ilanı veya tebligat ise is_recruitment: false döndür.)
2) Eğer personel alım ilanı ise (is_recruitment: true), aşağıdaki JSON şemasında yapılandır:
{
  "is_recruitment": true | false,
  "institution": "Kurum Adı (Örn: Rekabet Kurumu)",
  "title": "İlan Başlığı",
  "deadline": "YYYY-MM-DDTHH:MM:SS",
  "application_method": "Başvuru yeri ve URL (Örn: Kariyer Kapısı https://kariyerkapisi.gov.tr/Ilanlar/UyeIlanlar)",
  "raw_summary": "2-3 cümlelik özet",
  "positions": [
    {
      "title": "Kadro Ünvanı",
      "quota": 1,
      "education_level": "LISE" | "ONLISANS" | "LISANS",
      "kpss_type": "KPSSP3" | "KPSSP93" | "KPSSP94" | "KPSS_YOK",
      "min_kpss_score": 70.0,
      "allowed_departments": ["Bölüm 1"],
      "is_any_department": false,
      "min_yds_level": "YOK" | "E" | "D" | "C" | "B" | "A",
      "max_age": 35,
      "gender_requirement": "HEPSI" | "ERKEK" | "KADIN",
      "cities": ["ANKARA"],
      "special_conditions": ["Özel şart"],
      "exam_type": "MULAKAT" | "KPSS_PUAN_USTUNLUGU" | "UYGULAMALI"
    }
  ]
}
Bağlantı Başlığı: ${linkTitle}
`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const geminiRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: 'application/pdf', data: base64Pdf } },
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      }),
    });

    if (!geminiRes.ok) return null;
    const json = await geminiRes.json();
    const txt = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!txt) return null;
    const parsed = JSON.parse(txt);
    if (!parsed?.is_recruitment || !Array.isArray(parsed.positions) || parsed.positions.length === 0) {
      return null;
    }
    return parsed;
  } catch (e) {
    console.warn(`PDF Gemini analiz hatası (${pdfUrl}):`, e);
    return null;
  }
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Yetkisiz erişim. Yönetici girişi gereklidir.' }, { status: 401 });
  }
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase bağlantısı yapılandırılmamış. Lütfen ortam değişkenlerini kontrol edin.' },
        { status: 500 }
      );
    }

    let addedCount = 0;
    let liveResmiGazeteCount = 0;

    // 1. Önce doğrulanmış güncel havuzu şemaya uygun şekilde Supabase ile senkronize et
    for (const ann of SAMPLE_ANNOUNCEMENTS) {
      if (new Date(ann.deadline).getTime() < Date.now()) continue;

      const isGenericUrl = ann.source_url === 'https://www.resmigazete.gov.tr';
      const { data: existing } = isGenericUrl
        ? await supabaseAdmin
            .from('announcements')
            .select('id')
            .eq('title', ann.title)
            .maybeSingle()
        : await supabaseAdmin
            .from('announcements')
            .select('id')
            .eq('source_url', ann.source_url)
            .maybeSingle();

      if (existing) continue;

      const insertSourceUrl = isGenericUrl
        ? `https://www.resmigazete.gov.tr/#${ann.id}`
        : ann.source_url;

      const safeSource = ann.source === 'RESMI_GAZETE' || ann.source === 'KARIYER_KAPISI' || ann.source === 'MANUEL'
        ? ann.source
        : 'KARIYER_KAPISI';

      const { data: insertedAnn, error: annErr } = await supabaseAdmin
        .from('announcements')
        .insert({
          source: safeSource,
          source_url: insertSourceUrl,
          institution: ann.institution,
          title: ann.title,
          publish_date: ann.publish_date,
          deadline: ann.deadline,
          application_method: ann.application_method,
          raw_summary: ann.raw_summary,
          is_active: true,
        })
        .select('id')
        .single();

      if (insertedAnn && !annErr) {
        const positionsToInsert = (ann.positions || []).map(p => sanitizePositionForSchema(p, insertedAnn.id));
        if (positionsToInsert.length > 0) {
          await supabaseAdmin.from('positions').insert(positionsToInsert);
        }
        addedCount++;
      }
    }

    // 2. Canlı Resmî Gazete Çeşitli İlanlar'dan (bugün ve dün) henüz eklenmemiş PDF'leri tara
    if (GEMINI_API_KEY) {
      const liveLinks = await fetchLiveResmiGazeteLinks(1);
      let checkedPdfs = 0;

      for (const item of liveLinks) {
        if (checkedPdfs >= 6) break; // Serverless timeout ve kota koruması

        const { data: existing } = await supabaseAdmin
          .from('announcements')
          .select('id')
          .eq('source_url', item.url)
          .maybeSingle();

        if (existing) continue;
        checkedPdfs++;

        const parsed = await analyzeResmiGazetePdfWithGemini(item.url, item.title);
        if (!parsed) continue;

        const { data: insertedAnn, error: annErr } = await supabaseAdmin
          .from('announcements')
          .insert({
            source: 'RESMI_GAZETE',
            source_url: item.url,
            institution: parsed.institution || item.title,
            title: parsed.title || item.title,
            publish_date: item.date,
            deadline: parsed.deadline,
            application_method: parsed.application_method || 'Kariyer Kapısı (https://kariyerkapisi.gov.tr/Ilanlar/UyeIlanlar)',
            raw_summary: parsed.raw_summary || null,
            is_active: true,
          })
          .select('id')
          .single();

        if (insertedAnn && !annErr) {
          const positionsToInsert = parsed.positions.map((p: any) => sanitizePositionForSchema(p, insertedAnn.id));
          if (positionsToInsert.length > 0) {
            await supabaseAdmin.from('positions').insert(positionsToInsert);
          }
          addedCount++;
          liveResmiGazeteCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      addedCount,
      liveResmiGazeteCount,
      message:
        addedCount > 0
          ? `${addedCount} adet yeni kamu ilanı (${liveResmiGazeteCount} canlı Resmî Gazete PDF) veritabanına eklendi!`
          : 'Tüm güncel Resmî Gazete ve kurum ilanları zaten veritabanında mevcut.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Tarama hatası' }, { status: 500 });
  }
}
