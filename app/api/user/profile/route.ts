import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Sunucu tarafında kalıcı profil deposu
let memoryProfiles: Record<string, any> = {};

function getProfilesFilePath() {
  const baseDir = process.env.NODE_ENV === 'production' && process.platform !== 'win32' ? '/tmp' : process.cwd();
  return path.join(baseDir, '.user_profiles.json');
}

function loadProfilesFromFile() {
  try {
    const filePath = getProfilesFilePath();
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (content) {
        memoryProfiles = JSON.parse(content);
      }
    }
  } catch (e) {
    console.warn('Sunucu profil deposu okuma hatası:', e);
  }
}

function saveProfilesToFile() {
  try {
    const filePath = getProfilesFilePath();
    fs.writeFileSync(filePath, JSON.stringify(memoryProfiles, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Sunucu profil deposu yazma hatası:', e);
  }
}

// İlk açılışta verileri yükle
loadProfilesFromFile();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email')?.toLowerCase().trim();

    if (!email) {
      return NextResponse.json({ error: 'E-posta adresi gereklidir.' }, { status: 400 });
    }

    loadProfilesFromFile();
    const userRecord = memoryProfiles[email];

    if (userRecord && userRecord.profile) {
      return NextResponse.json({
        success: true,
        found: true,
        profile: userRecord.profile,
        favorites: userRecord.favorites || [],
        fullName: userRecord.fullName || userRecord.profile?.full_name,
      });
    }

    return NextResponse.json({ success: true, found: false });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Profil getirme hatası' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, profile, favorites, fullName } = body;

    if (!email) {
      return NextResponse.json({ error: 'E-posta adresi zorunludur.' }, { status: 400 });
    }

    const normEmail = email.toLowerCase().trim();
    loadProfilesFromFile();

    const existing = memoryProfiles[normEmail] || {};
    memoryProfiles[normEmail] = {
      email: normEmail,
      fullName: fullName || profile?.full_name || existing.fullName || normEmail.split('@')[0],
      profile: profile || existing.profile,
      favorites: favorites || existing.favorites || [],
      updatedAt: new Date().toISOString(),
    };

    saveProfilesToFile();

    return NextResponse.json({
      success: true,
      message: 'Profil sunucuda başarıyla kaydedildi.',
      profile: memoryProfiles[normEmail].profile,
      favorites: memoryProfiles[normEmail].favorites,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Profil kaydetme hatası' }, { status: 500 });
  }
}
