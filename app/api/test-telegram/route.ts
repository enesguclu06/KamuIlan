import { NextRequest, NextResponse } from 'next/server';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

export async function POST(req: NextRequest) {
  try {
    const { chatId, userName } = await req.json();

    if (!chatId) {
      return NextResponse.json({ error: 'Lütfen Telegram Chat ID girin.' }, { status: 400 });
    }

    if (!TELEGRAM_BOT_TOKEN) {
      return NextResponse.json({
        success: true,
        simulated: true,
        message: 'TELEGRAM_BOT_TOKEN ortam değişkeni henüz tanımlanmadı. Bildirim testi simüle edildi.',
      });
    }

    const message = `
👋 <b>Tebrikler ${userName || 'Aday'}!</b>

Kamu İlan Takip & Akıllı Eşleştirme Telegram bildirim entegrasyonunuz <b>başarıyla sağlandı</b>.

🎯 Profilinize (Bölüm, KPSS, Yaş, YDS vb.) <b>tam uyan</b> yeni bir kamu personeli veya memur alım ilanı yayımlandığında, doğrudan buraya anlık uyarı alacaksınız.
`.trim();

    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      return NextResponse.json(
        { error: `Telegram Hatası: ${data.description || 'Mesaj gönderilemedi. Lütfen botu başlattığınızdan (/start) ve Chat ID\'nin doğruluğundan emin olun.'}` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Test mesajı Telegram hesabınıza başarıyla iletildi!',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Sunucu hatası' }, { status: 500 });
  }
}
