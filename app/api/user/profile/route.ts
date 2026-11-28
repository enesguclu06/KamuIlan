import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isAdminConfigured } from '@/lib/supabase/admin';
import {
  loadLocalProfiles,
  saveLocalProfiles,
  pickSchemaProfileFields,
  findSupabaseUserByEmail,
  sanitizeEmail,
  mergeProfilesSafe,
} from '@/lib/server/user-store';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawEmail = searchParams.get('email');

    if (!rawEmail) {
      return NextResponse.json({ error: 'E-posta adresi gereklidir.' }, { status: 400 });
    }

    const email = sanitizeEmail(rawEmail);
    const memoryProfiles = loadLocalProfiles();
    const localRecord = memoryProfiles[email];

    // 1. Supabase Admin aktifse kalıcı Supabase Auth + user_profiles verisini çek
    if (isAdminConfigured && supabaseAdmin) {
      const supaUser = await findSupabaseUserByEmail(email);
      if (supaUser) {
        const meta = supaUser.user_metadata || {};
        let dbRow: any = null;
        try {
          const { data } = await supabaseAdmin
            .from('user_profiles')
            .select('*')
            .eq('user_id', supaUser.id)
            .single();
          if (data) dbRow = data;
        } catch {}

        const mergedProfile = mergeProfilesSafe(dbRow, localRecord?.profile, meta.profile, {
          email,
          user_id: supaUser.id,
          full_name: meta.full_name || meta.profile?.full_name || dbRow?.full_name || localRecord?.fullName,
          is_registered: true,
        });

        const favorites = Array.isArray(meta.favorites)
          ? meta.favorites
          : localRecord?.favorites || [];

        return NextResponse.json({
          success: true,
          found: true,
          profile: mergedProfile,
          favorites,
          fullName: mergedProfile.full_name,
          isRegistered: true,
        });
      }
    }

    // 2. Yerel sunucu deposundan kontrol et
    if (localRecord && localRecord.profile) {
      return NextResponse.json({
        success: true,
        found: true,
        profile: localRecord.profile,
        favorites: localRecord.favorites || [],
        fullName: localRecord.fullName || localRecord.profile?.full_name,
        isRegistered: Boolean(localRecord.isRegistered),
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
    const { email, profile, favorites, fullName, isRegistered, registeredAt } = body;

    if (!email) {
      return NextResponse.json({ error: 'E-posta adresi zorunludur.' }, { status: 400 });
    }

    const normEmail = sanitizeEmail(email);
    const memoryProfiles = loadLocalProfiles();
    const existing = memoryProfiles[normEmail] || ({} as any);

    const computedIsRegistered =
      isRegistered !== undefined
        ? Boolean(isRegistered)
        : existing.isRegistered !== undefined
          ? existing.isRegistered
          : !normEmail.includes('@yerel.kamuilan') && !normEmail.startsWith('misafir_');

    const resolvedFullName =
      fullName ||
      profile?.full_name ||
      existing.fullName ||
      (computedIsRegistered ? normEmail.split('@')[0] : 'Misafir Aday');

    const mergedProfile = profile
      ? mergeProfilesSafe(existing.profile, profile)
      : existing.profile;
    const mergedFavorites = favorites || existing.favorites || [];

    // Mevcut passwordHash kesinlikle korunur!
    memoryProfiles[normEmail] = {
      ...existing,
      email: normEmail,
      fullName: resolvedFullName,
      passwordHash: existing.passwordHash,
      profile: mergedProfile,
      favorites: mergedFavorites,
      isRegistered: computedIsRegistered,
      registeredAt:
        registeredAt ||
        existing.registeredAt ||
        (computedIsRegistered ? new Date().toISOString() : undefined),
      updatedAt: new Date().toISOString(),
    };

    saveLocalProfiles(memoryProfiles);

    // Supabase Admin aktifse kalıcı olarak auth.users metadata ve user_profiles tablosuna yaz
    if (isAdminConfigured && supabaseAdmin && computedIsRegistered) {
      try {
        const supaUser = await findSupabaseUserByEmail(normEmail);
        if (supaUser) {
          await supabaseAdmin.auth.admin.updateUserById(supaUser.id, {
            user_metadata: {
              ...(supaUser.user_metadata || {}),
              full_name: resolvedFullName,
              is_registered: true,
              profile: mergedProfile,
              favorites: mergedFavorites,
            },
          });

          try {
            await supabaseAdmin
              .from('user_profiles')
              .upsert(pickSchemaProfileFields(supaUser.id, mergedProfile, resolvedFullName));
          } catch (tblErr) {
            console.warn('user_profiles tablo güncelleme hatası (metadata güncellendi):', tblErr);
          }
        }
      } catch (e) {
        console.warn('Supabase profil senkronizasyon hatası:', e);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Profil sunucuda başarıyla kaydedildi.',
      profile: mergedProfile,
      favorites: mergedFavorites,
      isRegistered: computedIsRegistered,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Profil kaydetme hatası' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email')?.toLowerCase().trim();

    if (!email) {
      return NextResponse.json({ error: 'E-posta zorunludur.' }, { status: 400 });
    }

    const memoryProfiles = loadLocalProfiles();
    if (memoryProfiles[email]) {
      delete memoryProfiles[email];
      saveLocalProfiles(memoryProfiles);
    }

    return NextResponse.json({ success: true, message: 'Kullanıcı profili silindi.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Silme hatası' }, { status: 500 });
  }
}
