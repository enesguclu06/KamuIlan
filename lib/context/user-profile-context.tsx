'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { SAMPLE_ANNOUNCEMENTS } from '@/lib/sample-data';

function sanitizeFavorites(rawList: any[]): string[] {
  if (!Array.isArray(rawList)) return [];
  const validIds = new Set(SAMPLE_ANNOUNCEMENTS.map((a) => a.id));
  const unique = Array.from(new Set(rawList));
  return unique.filter((id) => typeof id === 'string' && validIds.has(id));
}

interface UserProfileContextType {
  profile: UserProfile | null;
  hasProfileFilled: boolean;
  updateProfile: (newProfile: UserProfile) => Promise<void>;
  resetProfile: () => void;
  isLoading: boolean;
  isLoggedIn: boolean;
  userEmail: string | null;
  completeAuthSession: (
    email: string,
    fullName?: string,
    serverProfile?: UserProfile | null,
    serverFavorites?: string[],
    clientAuthHash?: string
  ) => Promise<void>;
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

            const metaProfile = session.user.user_metadata?.profile;
            const metaFavorites = session.user.user_metadata?.favorites;

            if (metaProfile && (metaProfile.department || metaProfile.kpss_score || metaProfile.education_level || metaProfile.full_name)) {
              setProfile(metaProfile as UserProfile);
              if (Array.isArray(metaFavorites)) {
                const cleaned = sanitizeFavorites(metaFavorites);
                setFavorites(cleaned);
                try {
                  localStorage.setItem(FAVS_KEY, JSON.stringify(cleaned));
                } catch {}
              }
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
                const cleaned = sanitizeFavorites(data.favorites);
                setFavorites(cleaned);
                try {
                  localStorage.setItem(FAVS_KEY, JSON.stringify(cleaned));
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
          if (Array.isArray(parsedFavs)) {
            const cleaned = sanitizeFavorites(parsedFavs);
            setFavorites(cleaned);
            if (cleaned.length !== parsedFavs.length) {
              try {
                localStorage.setItem(FAVS_KEY, JSON.stringify(cleaned));
              } catch {}
            }
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
    let activeEmail = userEmail || newProfile.email;
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
      const isAccountRegistered = Boolean(isLoggedIn || (!normEmail.includes('@yerel.kamuilan') && !normEmail.startsWith('misafir_')));

      try {
        const dbRaw = localStorage.getItem(ACCOUNTS_DB_KEY) || '{}';
        const db = JSON.parse(dbRaw);
        const existingLocalRecord = db[normEmail] || {};
        db[normEmail] = {
          ...existingLocalRecord,
          profile: newProfile,
          favorites,
          fullName: newProfile.full_name || existingLocalRecord.fullName || (isAccountRegistered ? normEmail.split('@')[0] : 'Misafir Aday'),
          isRegistered: isAccountRegistered,
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem(ACCOUNTS_DB_KEY, JSON.stringify(db));
      } catch (e) {
        console.warn('Hesap veritabanı yazma hatası:', e);
      }

      // 3. Sunucuya kalıcı olarak kaydet (Supabase auth.users + user_profiles + sunucu deposu)
      try {
        await fetch('/api/user/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: normEmail,
            profile: newProfile,
            favorites,
            fullName: newProfile.full_name,
            isRegistered: isAccountRegistered,
          }),
        });
      } catch (err) {
        console.warn('Sunucuya profil yazma isteği hatası:', err);
      }
    }
  };

  const completeAuthSession = async (
    email: string,
    fullName?: string,
    serverProfile?: UserProfile | null,
    serverFavorites?: string[],
    clientAuthHash?: string
  ) => {
    const normEmail = email.toLowerCase().trim();
    const resolvedName = fullName?.trim() || serverProfile?.full_name || normEmail.split('@')[0];

    setIsLoggedIn(true);
    setUserEmail(normEmail);

    try {
      localStorage.setItem(
        AUTH_KEY,
        JSON.stringify({
          email: normEmail,
          fullName: resolvedName,
          loggedInAt: new Date().toISOString(),
        })
      );
    } catch (e) {
      console.warn('Yerel oturum kaydetme hatası:', e);
    }

    // Eski misafir anahtarını temizle (çift kayıt ve misafir kopyası kalmasın!)
    try {
      const anonId = localStorage.getItem('kamu_ilan_anon_id');
      if (anonId) {
        const dbRaw = localStorage.getItem(ACCOUNTS_DB_KEY);
        if (dbRaw) {
          const db = JSON.parse(dbRaw);
          if (db[anonId]) {
            delete db[anonId];
            localStorage.setItem(ACCOUNTS_DB_KEY, JSON.stringify(db));
          }
        }
        localStorage.removeItem('kamu_ilan_anon_id');
        fetch(`/api/admin/users?email=${encodeURIComponent(anonId)}`, { method: 'DELETE' }).catch(() => {});
      }
    } catch {}

    const finalProfile: UserProfile = {
      education_level: 'LISANS',
      graduation_status: 'MEZUN',
      kpss_type: 'KPSSP3',
      gender: 'BELIRTILMEMIS',
      military_status: 'YOK',
      ...(serverProfile || {}),
      email: normEmail,
      full_name: resolvedName,
      is_registered: true,
    };

    const cleanedFavs = sanitizeFavorites(serverFavorites || []);
    setProfile(finalProfile);
    setFavorites(cleanedFavs);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(finalProfile));
      localStorage.setItem(FAVS_KEY, JSON.stringify(cleanedFavs));

      const dbRaw = localStorage.getItem(ACCOUNTS_DB_KEY) || '{}';
      const db = JSON.parse(dbRaw);
      const existingRec = db[normEmail] || {};
      db[normEmail] = {
        ...existingRec,
        profile: finalProfile,
        favorites: cleanedFavs,
        fullName: resolvedName,
        isRegistered: true,
        passwordHash: clientAuthHash || existingRec.passwordHash,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(ACCOUNTS_DB_KEY, JSON.stringify(db));
    } catch (e) {
      console.warn('Oturum profil önbellek yazma hatası:', e);
    }
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
      const set = new Set(prev);
      if (set.has(id)) {
        set.delete(id);
      } else {
        set.add(id);
      }
      const next = sanitizeFavorites(Array.from(set));
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
        completeAuthSession,
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
