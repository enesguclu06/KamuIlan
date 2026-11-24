'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

interface UserProfileContextType {
  profile: UserProfile | null;
  hasProfileFilled: boolean;
  updateProfile: (newProfile: UserProfile) => Promise<void>;
  resetProfile: () => void;
  isLoading: boolean;
  isLoggedIn: boolean;
  userEmail: string | null;
  loginLocal: (email: string, fullName?: string, defaultCriteria?: Partial<UserProfile>) => Promise<void>;
  logout: () => Promise<void>;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  clearFavorites: () => void;
}

const STORAGE_KEY = 'kamu_ilan_user_profile_v2';
const AUTH_KEY = 'kamu_ilan_auth_session';
const FAVS_KEY = 'kamu_ilan_favs';
const ACCOUNTS_DB_KEY = 'kamu_ilan_accounts_db';

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    async function loadInitialProfile() {
      let currentLoggedInEmail: string | null = null;

      // 1. Supabase Auth kontrolü
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setIsLoggedIn(true);
            currentLoggedInEmail = session.user.email?.toLowerCase().trim() || null;
            setUserEmail(currentLoggedInEmail);

            const { data, error } = await (supabase as any)
              .from('user_profiles')
              .select('*')
              .eq('user_id', session.user.id)
              .single();

            if (data && !error && (data.department || data.kpss_score || data.education_level)) {
              setProfile(data as UserProfile);
              setIsLoading(false);
              return;
            }
          }
        } catch (e) {
          console.warn('Supabase auth session kontrol hatası:', e);
        }
      }

      // 2. Yerel Oturum (Local Auth Session) kontrolü
      if (!currentLoggedInEmail) {
        try {
          const storedAuth = localStorage.getItem(AUTH_KEY);
          if (storedAuth) {
            const authData = JSON.parse(storedAuth);
            if (authData?.email) {
              currentLoggedInEmail = authData.email.toLowerCase().trim();
              setIsLoggedIn(true);
              setUserEmail(currentLoggedInEmail);
            }
          }
        } catch (e) {
          console.warn('Yerel oturum okuma hatası:', e);
        }
      }

      // 3. Kullanıcı profili yükleme (Önce Sunucudan, sonra Hesap DB'sinden, en son Global LocalStorage'dan)
      let foundProfile: UserProfile | null = null;

      // A) Sunucudan kontrol et (Farklı cihazlar/telefonlar arası senkronizasyon için)
      if (currentLoggedInEmail) {
        try {
          const res = await fetch(`/api/user/profile?email=${encodeURIComponent(currentLoggedInEmail)}`);
          if (res.ok) {
            const data = await res.json();
            if (data?.found && data?.profile) {
              foundProfile = data.profile;
              if (data.favorites && Array.isArray(data.favorites)) {
                setFavorites(data.favorites);
                try {
                  localStorage.setItem(FAVS_KEY, JSON.stringify(data.favorites));
                } catch {}
              }
            }
          }
        } catch (err) {
          console.warn('Sunucudan profil senkronizasyon kontrol hatası:', err);
        }
      }

      // B) Yerel Hesap Veritabanından kontrol et
      if (!foundProfile && currentLoggedInEmail) {
        try {
          const dbRaw = localStorage.getItem(ACCOUNTS_DB_KEY);
          if (dbRaw) {
            const db = JSON.parse(dbRaw);
            if (db[currentLoggedInEmail]?.profile) {
              foundProfile = db[currentLoggedInEmail].profile;
            }
          }
        } catch {}
      }

      // C) Global LocalStorage yedeğinden kontrol et
      if (!foundProfile) {
        try {
          const local = localStorage.getItem(STORAGE_KEY);
          if (local) {
            const parsed = JSON.parse(local);
            if (parsed && (parsed.department || parsed.kpss_score || parsed.education_level || parsed.full_name)) {
              foundProfile = parsed;
            }
          }
        } catch {}
      }

      setProfile(foundProfile);

      // 4. Favoriler Depolama (LocalStorage)
      try {
        const storedFavs = localStorage.getItem(FAVS_KEY);
        if (storedFavs) {
          const parsedFavs = JSON.parse(storedFavs);
          if (Array.isArray(parsedFavs) && parsedFavs.length > 0) {
            setFavorites(parsedFavs);
          }
        }
      } catch (e) {
        console.warn('Favoriler okuma hatası:', e);
      }

      setIsLoading(false);
    }

    loadInitialProfile();
  }, []);

  const updateProfile = async (newProfile: UserProfile) => {
    setProfile(newProfile);

    // 1. Global LocalStorage'a kaydet
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile));
    } catch (e) {
      console.warn('LocalStorage yazma hatası:', e);
    }

    // 2. Aktif e-posta hesabına özel hesap veritabanına kaydet
    let activeEmail = userEmail;
    if (!activeEmail) {
      try {
        const stored = localStorage.getItem(AUTH_KEY);
        if (stored) activeEmail = JSON.parse(stored)?.email;
      } catch {}
    }
    if (!activeEmail) {
      // Eğer kullanıcı oturum açmadan profil doldurduysa, tarayıcıya özel tekil anonim kimlik ata
      let anonId = '';
      try {
        anonId = localStorage.getItem('kamu_ilan_anon_id') || '';
        if (!anonId) {
          anonId = `misafir_${Math.random().toString(36).substring(2, 9)}@yerel.kamuilan`;
          localStorage.setItem('kamu_ilan_anon_id', anonId);
        }
      } catch {}
      activeEmail = anonId || 'misafir@yerel.kamuilan';
    }

    if (activeEmail) {
      const normEmail = activeEmail.toLowerCase().trim();
      try {
        const dbRaw = localStorage.getItem(ACCOUNTS_DB_KEY) || '{}';
        const db = JSON.parse(dbRaw);
        db[normEmail] = {
          profile: newProfile,
          favorites,
          fullName: newProfile.full_name || normEmail.split('@')[0],
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem(ACCOUNTS_DB_KEY, JSON.stringify(db));
      } catch (e) {
        console.warn('Hesap veritabanı yazma hatası:', e);
      }

      // 3. Sunucuya gönder (Telefondan veya başka tarayıcıdan girildiğinde asla kaybolmasın)
      try {
        fetch('/api/user/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: normEmail,
            profile: newProfile,
            favorites,
            fullName: newProfile.full_name,
          }),
        }).catch((err) => console.warn('Sunucuya profil yazma isteği hatası:', err));
      } catch {}
    }

    // 4. Supabase yapılandırılmışsa buluta gönder
    if (isSupabaseConfigured && supabase && isLoggedIn) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await (supabase as any).from('user_profiles').upsert({
            ...newProfile,
            user_id: user.id,
            updated_at: new Date().toISOString(),
          });
        }
      } catch (e) {
        console.error('Supabase profil güncelleme hatası:', e);
      }
    }
  };

  const loginLocal = async (email: string, fullName?: string, defaultCriteria?: Partial<UserProfile>) => {
    const normEmail = email.toLowerCase().trim();
    setIsLoggedIn(true);
    setUserEmail(normEmail);

    try {
      localStorage.setItem(AUTH_KEY, JSON.stringify({
        email: normEmail,
        fullName: fullName || normEmail.split('@')[0],
        loggedInAt: new Date().toISOString()
      }));
    } catch (e) {
      console.warn('Yerel oturum kaydetme hatası:', e);
    }

    // 1. Önce Sunucudan bu e-posta için daha önce kaydedilmiş profil var mı kontrol et
    let existingProfile: UserProfile | null = null;
    try {
      const res = await fetch(`/api/user/profile?email=${encodeURIComponent(normEmail)}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.found && data?.profile) {
          existingProfile = data.profile;
          if (data.favorites && Array.isArray(data.favorites)) {
            setFavorites(data.favorites);
            try {
              localStorage.setItem(FAVS_KEY, JSON.stringify(data.favorites));
            } catch {}
          }
        }
      }
    } catch (e) {
      console.warn('Sunucudan profil sorgulama hatası:', e);
    }

    // 2. Sunucuda henüz yoksa yerel hesap veritabanından kontrol et
    if (!existingProfile) {
      try {
        const dbRaw = localStorage.getItem(ACCOUNTS_DB_KEY);
        if (dbRaw) {
          const db = JSON.parse(dbRaw);
          if (db[normEmail]?.profile) {
            existingProfile = db[normEmail].profile;
          }
        }
      } catch {}
    }

    // 3. Kullanıcının önceden kaydettiği bilgiler varsa KESİNLİKLE EZME, OLDUĞU GİBİ GERİ YÜKLE!
    if (existingProfile && (existingProfile.department || existingProfile.kpss_score || existingProfile.education_level)) {
      setProfile(existingProfile);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(existingProfile));
      } catch {}
      return;
    }

    // 4. Eğer bu hesap tamamen yeni ise ve hiçbir kayıt bulunamadıysa temiz profil oluştur
    const candidateName = fullName?.trim() || normEmail.split('@')[0];
    const newProfile: UserProfile = {
      full_name: candidateName,
      education_level: defaultCriteria?.education_level || 'LISANS',
      department: defaultCriteria?.department || '',
      graduation_status: defaultCriteria?.graduation_status || 'MEZUN',
      kpss_type: defaultCriteria?.kpss_type || 'KPSSP3',
      kpss_score: defaultCriteria?.kpss_score ?? undefined,
      gender: defaultCriteria?.gender || 'BELIRTILMEMIS',
      height: defaultCriteria?.height ?? undefined,
      weight: defaultCriteria?.weight ?? undefined,
      birth_date: defaultCriteria?.birth_date || '',
      military_status: defaultCriteria?.military_status || 'YOK',
      ...defaultCriteria,
    };
    await updateProfile(newProfile);
  };

  const resetProfile = () => {
    setProfile(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const logout = async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch {}
    }
    try {
      localStorage.removeItem(AUTH_KEY);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(FAVS_KEY);
    } catch {}
    setIsLoggedIn(false);
    setUserEmail(null);
    setProfile(null);
    setFavorites([]);
  };

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id];
      try {
        localStorage.setItem(FAVS_KEY, JSON.stringify(next));
      } catch (e) {
        console.warn('Favoriler kaydedilemedi:', e);
      }

      // Aktif oturum varsa sunucuya ve hesap DB'sine de bildir
      if (userEmail) {
        try {
          fetch('/api/user/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: userEmail,
              favorites: next,
            }),
          }).catch(() => {});
        } catch {}
      }
      return next;
    });
  };

  const isFavorite = (id: string) => favorites.includes(id);

  const clearFavorites = () => {
    setFavorites([]);
    try {
      localStorage.removeItem(FAVS_KEY);
    } catch {}
    if (userEmail) {
      try {
        fetch('/api/user/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: userEmail,
            favorites: [],
          }),
        }).catch(() => {});
      } catch {}
    }
  };

  const hasProfileFilled = Boolean(
    profile && (profile.department || profile.kpss_score || profile.education_level)
  );

  return (
    <UserProfileContext.Provider
      value={{
        profile,
        hasProfileFilled,
        updateProfile,
        resetProfile,
        isLoading,
        isLoggedIn,
        userEmail,
        loginLocal,
        logout,
        favorites,
        toggleFavorite,
        isFavorite,
        clearFavorites,
      }}
    >
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
}
