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
  logout: () => Promise<void>;
}

const STORAGE_KEY = 'kamu_ilan_user_profile_v2';

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

      // 2. Yerel Depolama (LocalStorage)
      try {
        const local = localStorage.getItem(STORAGE_KEY);
        if (local) {
          const parsed = JSON.parse(local);
          if (parsed && (parsed.department || parsed.kpss_score || parsed.education_level)) {
            setProfile(parsed);
          } else {
            setProfile(null);
          }
        } else {
          setProfile(null);
        }
      } catch {
        setProfile(null);
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

  const resetProfile = () => {
    setProfile(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const logout = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setIsLoggedIn(false);
    setUserEmail(null);
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
