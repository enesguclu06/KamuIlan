import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { announcement, positions, sourceUrl } = body;

    if (!announcement || !positions || positions.length === 0) {
      return NextResponse.json({ error: 'Geçersiz ilan veya kadro verisi.' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({
        success: true,
        message: 'Supabase bağlantısı henüz yapılandırılmadı (Test/Demo Modu). İlan hafızada simüle edildi.',
        simulated: true,
      });
    }

    // 1. İlanı Kaydet
    const url = sourceUrl || `https://ilan.gov.tr/manuel/${Date.now()}`;
    const { data: annData, error: annError } = await supabaseAdmin
      .from('announcements')
      .insert({
        source: 'MANUEL',
        source_url: url,
        institution: announcement.institution,
        title: announcement.title,
        publish_date: new Date().toISOString().split('T')[0],
        deadline: announcement.deadline,
        application_method: announcement.application_method,
        raw_summary: announcement.raw_summary,
        is_active: true,
      })
      .select('id')
      .single();

    if (annError || !annData) {
      return NextResponse.json({ error: `İlan kaydedilemedi: ${annError?.message}` }, { status: 500 });
    }

    const announcementId = annData.id;

    // 2. Kadroları Kaydet
    const positionsToInsert = positions.map((pos: any) => ({
      announcement_id: announcementId,
      title: pos.title,
      quota: pos.quota || 1,
      education_level: pos.education_level,
      kpss_type: pos.kpss_type,
      min_kpss_score: pos.min_kpss_score || 0,
      allowed_departments: pos.allowed_departments || [],
      is_any_department: Boolean(pos.is_any_department),
      min_yds_level: pos.min_yds_level || 'YOK',
      max_age: pos.max_age || null,
      gender_requirement: pos.gender_requirement || 'HEPSI',
      cities: pos.cities || ['TÜRKİYE GENELİ'],
      special_conditions: pos.special_conditions || [],
      exam_type: pos.exam_type || 'MULAKAT',
    }));

    const { error: posError } = await supabaseAdmin.from('positions').insert(positionsToInsert);
    if (posError) {
      console.error('Kadrolar eklenirken hata:', posError);
    }

    // 3. Telegram Bildirim Dağıtımı (Arka planda)
    let notifiedUsers = 0;
    if (TELEGRAM_BOT_TOKEN) {
      try {
        const { data: users } = await supabaseAdmin
          .from('user_profiles')
          .select('*')
          .eq('notify_enabled', true)
          .not('telegram_chat_id', 'is', null);

        if (users && users.length > 0) {
          const detailUrl = `${APP_URL}/ilan/${announcementId}`;
          const messageText = `
🎯 <b>YENİ KAMU İLANI YAYIMLANDI!</b>

🏛 <b>Kurum:</b> ${announcement.institution}
📋 <b>İlan:</b> ${announcement.title}
⏳ <b>Son Başvuru:</b> ${announcement.deadline?.split('T')[0] || 'Yakında'}
💼 <b>Kadro Sayısı:</b> ${positions.length} farklı unvan

👉 <a href="${detailUrl}">İlanı ve Uyum Durumunuzu İnceleyin</a>
`.trim();

          for (const u of users) {
            if (u.telegram_chat_id) {
              fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: u.telegram_chat_id,
                  text: messageText,
                  parse_mode: 'HTML',
                }),
              }).catch(() => {});
              notifiedUsers++;
            }
          }
        }
      } catch (tgError) {
        console.warn('Telegram bildirim gönderme hatası:', tgError);
      }
    }

    return NextResponse.json({
      success: true,
      announcementId,
      message: 'İlan ve kadrolar başarıyla veritabanına kaydedildi!',
      notifiedUsers,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Kayıt hatası' }, { status: 500 });
  }
}
