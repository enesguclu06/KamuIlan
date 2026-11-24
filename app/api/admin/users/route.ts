import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { supabaseAdmin } from '@/lib/supabase/admin';

function getProfilesFilePath() {
  const baseDir = process.env.NODE_ENV === 'production' && process.platform !== 'win32' ? '/tmp' : process.cwd();
  return path.join(baseDir, '.user_profiles.json');
}

export async function GET(req: NextRequest) {
  try {
    const usersMap: Record<string, any> = {};

    // 1. Sunucu dosyasından (.user_profiles.json) oku
    try {
      const filePath = getProfilesFilePath();
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        if (content) {
          const parsed = JSON.parse(content);
          Object.values(parsed).forEach((record: any) => {
            if (record?.email) {
              const email = record.email.toLowerCase().trim();
              usersMap[email] = {
                email,
                fullName: record.fullName || record.profile?.full_name || email.split('@')[0],
                profile: record.profile || null,
                favorites: record.favorites || [],
                updatedAt: record.updatedAt || new Date().toISOString(),
                source: 'SERVER_DB',
              };
            }
          });
        }
      }
    } catch (e) {
      console.warn('Sunucu profilleri okuma hatası:', e);
    }

    // 2. Supabase varsa user_profiles tablosundan çek
    if (supabaseAdmin) {
      try {
        const { data: dbProfiles, error: dbError } = await supabaseAdmin
          .from('user_profiles')
          .select('*')
          .order('updated_at', { ascending: false });

        if (dbProfiles && !dbError) {
          for (const row of dbProfiles) {
            const email = (row.email || row.user_id || '').toLowerCase().trim();
            if (email) {
              const existing = usersMap[email] || {};
              usersMap[email] = {
                email,
                fullName: row.full_name || existing.fullName || 'Kayıtlı Aday',
                profile: {
                  ...existing.profile,
                  ...row,
                  full_name: row.full_name || existing.fullName,
                },
                favorites: existing.favorites || [],
                updatedAt: row.updated_at || existing.updatedAt || new Date().toISOString(),
                source: 'SUPABASE',
              };
            }
          }
        }
      } catch (e) {
        console.warn('Supabase profilleri çekme hatası:', e);
      }
    }

    const usersList = Object.values(usersMap).sort((a: any, b: any) => {
      const timeA = new Date(a.updatedAt || 0).getTime();
      const timeB = new Date(b.updatedAt || 0).getTime();
      return timeB - timeA;
    });

    return NextResponse.json({
      success: true,
      totalCount: usersList.length,
      users: usersList,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Kullanıcı listesi alınamadı.' },
      { status: 500 }
    );
  }
}
