import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isAdminConfigured } from '@/lib/supabase/admin';
import {
  loadLocalProfiles,
  saveLocalProfiles,
  findSupabaseUserByEmail,
  sanitizeEmail,
  mergeProfilesSafe,
} from '@/lib/server/user-store';

export async function GET(req: NextRequest) {
  try {
    const usersMap: Record<string, any> = {};

    // 1. Sunucu dosyasından (.user_profiles.json) oku (passwordHash asla dönülmez)
    try {
      const parsed = loadLocalProfiles();
      Object.values(parsed).forEach((record: any) => {
        if (record?.email) {
          const email = sanitizeEmail(record.email);
          const isRegistered =
            record.isRegistered !== undefined
              ? Boolean(record.isRegistered)
              : !email.includes('@yerel.kamuilan') && !email.startsWith('misafir_');

          usersMap[email] = {
            email,
            fullName:
              record.fullName ||
              record.profile?.full_name ||
              (isRegistered ? email.split('@')[0] : 'Misafir Aday'),
            profile: record.profile || null,
            favorites: record.favorites || [],
            isRegistered,
            hasPassword: Boolean(record.passwordHash),
            registeredAt: record.registeredAt || record.updatedAt,
            updatedAt: record.updatedAt || new Date().toISOString(),
            source: 'SERVER_DB',
          };
        }
      });
    } catch (e) {
      console.warn('Sunucu profilleri okuma hatası:', e);
    }

    // 2. Supabase Auth (auth.users) + user_profiles tablosundan tüm gerçek kayıtlı kullanıcıları çek
    if (isAdminConfigured && supabaseAdmin) {
      const authUsersById: Record<string, any> = {};

      try {
        let page = 1;
        while (page <= 10) {
          const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers({
            page,
            perPage: 200,
          });
          if (authError || !authData?.users?.length) break;

          for (const authUser of authData.users) {
            authUsersById[authUser.id] = authUser;
            const email = authUser.email ? sanitizeEmail(authUser.email) : '';
            if (!email) continue;

            const meta = authUser.user_metadata || {};
            const existing = usersMap[email] || {};
            const metaProfile = meta.profile || {};

            usersMap[email] = {
              email,
              userId: authUser.id,
              fullName:
                meta.full_name ||
                metaProfile.full_name ||
                existing.fullName ||
                email.split('@')[0],
              profile: mergeProfilesSafe(existing.profile, metaProfile, {
                email,
                full_name:
                  meta.full_name ||
                  metaProfile.full_name ||
                  existing.fullName ||
                  email.split('@')[0],
              }),
              favorites: Array.isArray(meta.favorites)
                ? meta.favorites
                : existing.favorites || [],
              isRegistered: true,
              hasPassword: true,
              registeredAt: authUser.created_at || existing.registeredAt,
              updatedAt:
                authUser.updated_at ||
                authUser.last_sign_in_at ||
                existing.updatedAt ||
                authUser.created_at,
              source: 'SUPABASE',
            };
          }

          if (authData.users.length < 200) break;
          page++;
        }
      } catch (e) {
        console.warn('Supabase auth.users listeleme hatası:', e);
      }

      try {
        const { data: dbProfiles, error: dbError } = await supabaseAdmin
          .from('user_profiles')
          .select('*')
          .order('updated_at', { ascending: false });

        if (dbProfiles && !dbError) {
          for (const row of dbProfiles) {
            const matchedAuthUser = row.user_id ? authUsersById[row.user_id] : null;
            const email = sanitizeEmail(
              row.email || matchedAuthUser?.email || row.user_id || ''
            );
            if (!email) continue;

            const existing = usersMap[email] || {};
            const isRegistered =
              row.is_registered !== undefined
                ? Boolean(row.is_registered)
                : existing.isRegistered !== undefined
                  ? existing.isRegistered
                  : !email.includes('@yerel.kamuilan') && !email.startsWith('misafir_');

            usersMap[email] = {
              ...existing,
              email,
              fullName:
                row.full_name ||
                existing.fullName ||
                (isRegistered ? email.split('@')[0] : 'Misafir Aday'),
              profile: mergeProfilesSafe(row, existing.profile, {
                full_name: row.full_name || existing.fullName,
              }),
              favorites: existing.favorites || [],
              isRegistered,
              registeredAt: row.created_at || existing.registeredAt || row.updated_at,
              updatedAt: row.updated_at || existing.updatedAt || new Date().toISOString(),
              source: 'SUPABASE',
            };
          }
        }
      } catch (e) {
        console.warn('Supabase user_profiles çekme hatası:', e);
      }
    }

    const usersList = Object.values(usersMap).sort((a: any, b: any) => {
      const timeA = new Date(a.updatedAt || 0).getTime();
      const timeB = new Date(b.updatedAt || 0).getTime();
      return timeB - timeA;
    });

    return NextResponse.json({
      success: true,
      supabaseConfigured: isAdminConfigured,
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

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawEmail = searchParams.get('email');

    if (!rawEmail) {
      return NextResponse.json(
        { error: 'Silinecek e-posta adresi belirtilmelidir.' },
        { status: 400 }
      );
    }

    const email = sanitizeEmail(rawEmail);

    // 1. Sunucu dosyasından sil
    try {
      const parsed = loadLocalProfiles();
      if (parsed[email]) {
        delete parsed[email];
        saveLocalProfiles(parsed);
      }
    } catch (e) {
      console.warn('Dosyadan profil silme hatası:', e);
    }

    // 2. Supabase Auth + user_profiles varsa sil
    if (isAdminConfigured && supabaseAdmin) {
      try {
        const supaUser = await findSupabaseUserByEmail(email);
        if (supaUser) {
          await supabaseAdmin.from('user_profiles').delete().eq('user_id', supaUser.id);
          await supabaseAdmin.auth.admin.deleteUser(supaUser.id);
        }
        await supabaseAdmin.from('user_profiles').delete().eq('email', email);
      } catch (e) {
        console.warn('Supabase profil silme hatası:', e);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${email} kullanıcısı ve kayıtları başarıyla silindi.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Kullanıcı silinemedi.' },
      { status: 500 }
    );
  }
}
