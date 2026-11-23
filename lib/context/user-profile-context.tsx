'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

interface UserProfileContextType {
  profile: UserProfile | null;
  updateProfile: (newProfile: UserProfile) => Promise<void>;
  isLoading: boolean;
  isLoggedIn: boolean;
  userEmail: string | null;
  logout: () => Promise<void>;
}

const STORAGE_KEY = 'kamu_ilan_user_profile_v1';

const defaultProfile: UserProfile = {
  full_name: '',
  birth_date: '1998-05-15',
  gender: 'BELIRTILMEMIS',
  education_level: 'LISANS',
  department: 'Bilgisayar Mühendisliği',
  graduation_status: 'MEZUN',
  kpss_type: 'KPSSP3',
  kpss_score: 78.5,
  yds_level: 'D',
  certificates: ['B Sınıfı Ehliyet'],
  preferred_cities: [],
  telegram_chat_id: '',
  notify_enabled: true,
};

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    async function loadInitialProfile() {
      // 1. Supabase Auth kontrolü
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setIsLoggedIn(true);
            setUserEmail(session.user.email || null);

            // Supabase user_profiles tablosundan çek
            const { data, error } = await (supabase as any)
              .from('user_profiles')
              .select('*')
              .eq('user_id', session.user.id)
              .single();

            if (data && !error) {
              setProfile(data as UserProfile);
              setIsLoading(false);
              return;
            }
          }
        } catch (e) {
          console.warn('Supabase auth session kontrol hatası:', e);
        }
      }

      // 2. Yerel Depolama (LocalStorage) Yedeği
      try {
        const local = localStorage.getItem(STORAGE_KEY);
        if (local) {
          setProfile(JSON.parse(local));
        } else {
          // Kullanıcıya ilk girişte hoş bir deneyim sunmak için varsayılan profil
          setProfile(defaultProfile);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultProfile));
        }
      } catch {
        setProfile(defaultProfile);
      }
      setIsLoading(false);
    }

    loadInitialProfile();
  }, []);

  const updateProfile = async (newProfile: UserProfile) => {
    setProfile(newProfile);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile));
    } catch (e) {
      console.warn('LocalStorage yazma hatası:', e);
    }

    // Eğer kullanıcı Supabase'e giriş yapmışsa veritabanına da yaz
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

  const logout = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setIsLoggedIn(false);
    setUserEmail(null);
  };

  return (
    <UserProfileContext.Provider
      value={{
        profile,
        updateProfile,
        isLoading,
        isLoggedIn,
        userEmail,
        logout,
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
