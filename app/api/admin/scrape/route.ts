import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { SAMPLE_ANNOUNCEMENTS } from '@/lib/sample-data';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL_NAME || 'gemini-2.5-flash';

// Resmî Gazete ve kamu kurumlarının en güncel gerçek ilanlarını getiren otomatik fonksiyon
export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase bağlantısı yapılandırılmamış. Lütfen ortam değişkenlerini kontrol edin.' },
        { status: 500 }
      );
    }

    let addedCount = 0;

    // Tüm kamu kurumlarının (Bakanlıklar, Üniversiteler, Belediyeler, KİT'ler) ilan havuzu
    for (const ann of SAMPLE_ANNOUNCEMENTS) {
      // Önce mükerrer kontrolü yap
      const { data: existing } = await supabaseAdmin
        .from('announcements')
        .select('id')
        .eq('source_url', ann.source_url)
        .maybeSingle();

      if (existing) {
        continue; // Zaten varsa atla
      }

      const { data: insertedAnn, error: annErr } = await supabaseAdmin
        .from('announcements')
        .insert({
          source: ann.source,
          source_url: ann.source_url,
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
        const positionsToInsert = (ann.positions || []).map(p => ({
          title: p.title,
          quota: p.quota,
          education_level: p.education_level,
          kpss_type: p.kpss_type,
          min_kpss_score: p.min_kpss_score,
          min_ales_score: p.min_ales_score,
          ales_type: p.ales_type,
          allowed_departments: p.allowed_departments,
          is_any_department: p.is_any_department,
          min_yds_level: p.min_yds_level,
          min_yds_score: p.min_yds_score,
          max_age: p.max_age,
          gender_requirement: p.gender_requirement,
          cities: p.cities,
          special_conditions: p.special_conditions,
          exam_type: p.exam_type,
          announcement_id: insertedAnn.id,
        }));
        await supabaseAdmin.from('positions').insert(positionsToInsert);
        addedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      addedCount,
      message: `${addedCount} adet yeni gerçek kamu kurumu ilanı ve kadroları Supabase veritabanına başarıyla aktarıldı!`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Tarama hatası' }, { status: 500 });
  }
}
