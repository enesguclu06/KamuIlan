import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin, isAdminConfigured } from '@/lib/supabase/admin';
import {
  hashPassword,
  verifyPassword,
  loadLocalProfiles,
  saveLocalProfiles,
  pickSchemaProfileFields,
  findSupabaseUserByEmail,
  sanitizeEmail,
  isValidEmail,
  mergeProfilesSafe,
} from '@/lib/server/user-store';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const isSupabaseAuthEnabled = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('your-project-id')
);

function createAnonSupabaseClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, email, password, fullName, guestProfile, guestFavorites } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Lütfen e-posta adresinizi girin.' }, { status: 400 });
    }

    const normEmail = sanitizeEmail(email);
    if (!isValidEmail(normEmail)) {
      return NextResponse.json({ error: 'Lütfen geçerli bir e-posta adresi girin.' }, { status: 400 });
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Lütfen şifrenizi girin.' }, { status: 400 });
    }

    if (action !== 'register' && action !== 'login') {
      return NextResponse.json({ error: 'Geçersiz işlem türü.' }, { status: 400 });
    }

    // =========================================================================
    // 1. KAYIT OL (REGISTER)
    // =========================================================================
    if (action === 'register') {
      const cleanName = typeof fullName === 'string' ? fullName.trim() : '';
      if (cleanName.length < 2) {
        return NextResponse.json(
          { error: 'Kayıt olmak için lütfen adınızı ve soyadınızı girin.' },
          { status: 400 }
        );
      }

      if (password.length < 6) {
        return NextResponse.json(
          { error: 'Şifreniz güvenliğiniz için en az 6 karakter olmalıdır.' },
          { status: 400 }
        );
      }

      const initialProfile = {
        ...(guestProfile && (guestProfile.department || guestProfile.kpss_score || guestProfile.education_level)
          ? guestProfile
          : {
              education_level: 'LISANS',
              graduation_status: 'MEZUN',
              kpss_type: 'KPSSP3',
              gender: 'BELIRTILMEMIS',
              military_status: 'YOK',
            }),
        full_name: cleanName,
        email: normEmail,
        is_registered: true,
        registered_at: new Date().toISOString(),
      };
      const cleanFavorites = Array.isArray(guestFavorites) ? guestFavorites : [];
      const passwordHash = hashPassword(password);

      // A) Supabase Admin aktifse gerçek Supabase Auth hesabı oluştur
      if (isAdminConfigured && supabaseAdmin) {
        const existingSupaUser = await findSupabaseUserByEmail(normEmail);
        if (existingSupaUser) {
          return NextResponse.json(
            { error: 'Bu e-posta adresi zaten kayıtlı! Lütfen Giriş Yap ekranından giriş yapın.' },
            { status: 409 }
          );
        }

        const { data: createdData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: normEmail,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: cleanName,
            is_registered: true,
            profile: initialProfile,
            favorites: cleanFavorites,
          },
        });

        if (createError || !createdData?.user) {
          const msgLower = (createError?.message || '').toLowerCase();
          if (msgLower.includes('already') || msgLower.includes('registered') || msgLower.includes('exists')) {
            return NextResponse.json(
              { error: 'Bu e-posta adresi zaten kayıtlı! Lütfen giriş yapın.' },
              { status: 409 }
            );
          }
          return NextResponse.json(
            { error: createError?.message || 'Hesap oluşturulamadı.' },
            { status: 400 }
          );
        }

        const userId = createdData.user.id;
        initialProfile.user_id = userId;

        // user_profiles tablosuna da uyumlu kolonlarla yaz
        try {
          await supabaseAdmin
            .from('user_profiles')
            .upsert(pickSchemaProfileFields(userId, initialProfile, cleanName));
        } catch (e) {
          console.warn('user_profiles ilk kayıt hatası (metadata kaydedildi):', e);
        }

        // Yerel sunucu deposunu da güncelle
        const localProfiles = loadLocalProfiles();
        localProfiles[normEmail] = {
          email: normEmail,
          fullName: cleanName,
          passwordHash,
          profile: initialProfile,
          favorites: cleanFavorites,
          isRegistered: true,
          registeredAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          supabaseUserId: userId,
        };
        saveLocalProfiles(localProfiles);

        // Oturum tokenı al
        let sessionTokens = null;
        if (isSupabaseAuthEnabled) {
          try {
            const anonClient = createAnonSupabaseClient();
            const { data: signInData } = await anonClient.auth.signInWithPassword({
              email: normEmail,
              password,
            });
            if (signInData?.session) {
              sessionTokens = {
                access_token: signInData.session.access_token,
                refresh_token: signInData.session.refresh_token,
              };
            }
          } catch {}
        }

        return NextResponse.json({
          success: true,
          user: {
            email: normEmail,
            fullName: cleanName,
            userId,
          },
          profile: initialProfile,
          favorites: cleanFavorites,
          session: sessionTokens,
        });
      }

      // B) Supabase Admin yoksa sunucu deposunda gerçek şifre hash'iyle kaydet
      const localProfiles = loadLocalProfiles();
      const existingLocal = localProfiles[normEmail];
      if (existingLocal && existingLocal.isRegistered && existingLocal.passwordHash) {
        return NextResponse.json(
          { error: 'Bu e-posta adresi zaten kayıtlı! Lütfen Giriş Yap ekranından giriş yapın.' },
          { status: 409 }
        );
      }

      // Eğer eski şifresiz bir kayıt varsa profilini koru
      const mergedProfile = existingLocal?.profile
        ? {
            ...existingLocal.profile,
            full_name: cleanName || existingLocal.profile.full_name,
            email: normEmail,
            is_registered: true,
          }
        : initialProfile;

      const mergedFavorites = existingLocal?.favorites?.length
        ? existingLocal.favorites
        : cleanFavorites;

      localProfiles[normEmail] = {
        email: normEmail,
        fullName: cleanName,
        passwordHash,
        profile: mergedProfile,
        favorites: mergedFavorites,
        isRegistered: true,
        registeredAt: existingLocal?.registeredAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      saveLocalProfiles(localProfiles);

      return NextResponse.json({
        success: true,
        user: {
          email: normEmail,
          fullName: cleanName,
        },
        profile: mergedProfile,
        favorites: mergedFavorites,
        clientAuthHash: passwordHash,
        ephemeralStorage: true,
      });
    }

    // =========================================================================
    // 2. GİRİŞ YAP (LOGIN) - Sadece E-posta + Şifre doğrulaması
    // =========================================================================
    const localProfiles = loadLocalProfiles();
    const existingLocal = localProfiles[normEmail];

    // A) Supabase Auth aktifse öncelikle Supabase üzerinden doğrula
    if (isSupabaseAuthEnabled) {
      const anonClient = createAnonSupabaseClient();
      const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
        email: normEmail,
        password,
      });

      if (!signInError && signInData?.user) {
        const supaUser = signInData.user;
        const meta = supaUser.user_metadata || {};

        let dbProfile: any = null;
        if (isAdminConfigured && supabaseAdmin) {
          try {
            const { data } = await supabaseAdmin
              .from('user_profiles')
              .select('*')
              .eq('user_id', supaUser.id)
              .single();
            if (data) dbProfile = data;
          } catch {}
        }

        const resolvedFullName =
          meta.full_name || dbProfile?.full_name || existingLocal?.fullName || normEmail.split('@')[0];

        const resolvedProfile = mergeProfilesSafe(dbProfile, existingLocal?.profile, meta.profile, {
          email: normEmail,
          full_name: resolvedFullName,
          user_id: supaUser.id,
          is_registered: true,
        });
        const resolvedFavorites = Array.isArray(meta.favorites)
          ? meta.favorites
          : existingLocal?.favorites || [];

        // Yerel sunucu deposunu güncelle
        localProfiles[normEmail] = {
          email: normEmail,
          fullName: resolvedFullName,
          passwordHash: hashPassword(password),
          profile: resolvedProfile,
          favorites: resolvedFavorites,
          isRegistered: true,
          registeredAt: supaUser.created_at || existingLocal?.registeredAt,
          updatedAt: new Date().toISOString(),
          supabaseUserId: supaUser.id,
        };
        saveLocalProfiles(localProfiles);

        return NextResponse.json({
          success: true,
          user: {
            email: normEmail,
            fullName: resolvedFullName,
            userId: supaUser.id,
          },
          profile: resolvedProfile,
          favorites: resolvedFavorites,
          session: signInData.session
            ? {
                access_token: signInData.session.access_token,
                refresh_token: signInData.session.refresh_token,
              }
            : null,
        });
      }

      // Supabase'de giriş başarısız oldu! Kullanıcı mı yok, şifre mi yanlış?
      if (isAdminConfigured && supabaseAdmin) {
        const existingSupaUser = await findSupabaseUserByEmail(normEmail);
        if (existingSupaUser) {
          // Kullanıcı Supabase'de VAR ama şifre yanlış (veya e-posta onaysız)
          if (!existingSupaUser.email_confirmed_at) {
            // Eğer eski sistemden onaysız kaldıysa ve şifre doğruysa mı? signInWithPassword zaten Email not confirmed verir.
            return NextResponse.json(
              { error: 'E-posta adresiniz veya şifreniz hatalı (veya hesabınız henüz onaylanmamış).' },
              { status: 401 }
            );
          }
          return NextResponse.json(
            { error: 'Girdiğiniz şifre hatalı! Lütfen kontrol edip tekrar deneyin.' },
            { status: 401 }
          );
        }

        // Kullanıcı Supabase'de yoksa, acaba sadece sunucu yerel deposunda mı kayıtlı?
        if (existingLocal && existingLocal.isRegistered && existingLocal.passwordHash) {
          if (!verifyPassword(password, existingLocal.passwordHash)) {
            return NextResponse.json(
              { error: 'Girdiğiniz şifre hatalı! Lütfen kontrol edip tekrar deneyin.' },
              { status: 401 }
            );
          }
          // Şifre doğruysa Supabase'e otomatik taşı
          try {
            const { data: migrated } = await supabaseAdmin.auth.admin.createUser({
              email: normEmail,
              password,
              email_confirm: true,
              user_metadata: {
                full_name: existingLocal.fullName,
                is_registered: true,
                profile: existingLocal.profile,
                favorites: existingLocal.favorites || [],
              },
            });
            if (migrated?.user) {
              existingLocal.supabaseUserId = migrated.user.id;
              saveLocalProfiles(localProfiles);
            }
          } catch {}

          return NextResponse.json({
            success: true,
            user: {
              email: normEmail,
              fullName: existingLocal.fullName,
            },
            profile: existingLocal.profile,
            favorites: existingLocal.favorites || [],
          });
        }

        return NextResponse.json(
          { error: 'Bu e-posta adresine kayıtlı bir hesap bulunamadı. Lütfen önce "Kayıt Ol" seçeneğinden hesap oluşturun.' },
          { status: 401 }
        );
      }
    }

    // B) Sadece sunucu deposu modu (Supabase yokken)
    if (!existingLocal || !existingLocal.isRegistered) {
      return NextResponse.json(
        {
          error: 'Bu e-posta adresine kayıtlı bir hesap bulunamadı. Lütfen önce "Hesap Oluştur" bölümünden kayıt olun.',
          code: 'USER_NOT_FOUND',
          ephemeralStorage: !isAdminConfigured,
        },
        { status: 401 }
      );
    }

    if (!existingLocal.passwordHash) {
      return NextResponse.json(
        {
          error: 'Bu hesap için şifre tanımlanmamış görünüyor. Güvenliğiniz için lütfen "Hesap Oluştur" sekmesinden aynı e-posta ile şifrenizi belirleyin.',
          code: 'NO_PASSWORD_SET',
        },
        { status: 401 }
      );
    }

    if (!verifyPassword(password, existingLocal.passwordHash)) {
      return NextResponse.json(
        { error: 'E-posta adresi veya şifre hatalı! Lütfen tekrar deneyin.', code: 'INVALID_PASSWORD' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        email: normEmail,
        fullName: existingLocal.fullName,
      },
      profile: existingLocal.profile,
      favorites: existingLocal.favorites || [],
      ephemeralStorage: !isAdminConfigured,
    });
  } catch (err: any) {
    console.error('Auth API hatası:', err);
    return NextResponse.json(
      { error: err?.message || 'Kimlik doğrulama sırasında sunucu hatası oluştu.' },
      { status: 500 }
    );
  }
}
