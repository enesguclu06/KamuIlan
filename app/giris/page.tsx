'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Mail,
  Lock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  User,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  LogOut,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { useUserProfile } from '@/lib/context/user-profile-context';

export default function LoginPage() {
  const router = useRouter();
  const { completeAuthSession, isLoggedIn, userEmail, profile, favorites, logout } = useUserProfile();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; success: boolean } | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setMsg({ text: 'Lütfen e-posta adresinizi girin.', success: false });
      return;
    }

    if (!password) {
      setMsg({ text: 'Lütfen şifrenizi girin.', success: false });
      return;
    }

    if (isSignUp) {
      if (fullName.trim().length < 2) {
        setMsg({ text: 'Kayıt olmak için lütfen adınızı ve soyadınızı girin.', success: false });
        return;
      }
      if (password.length < 6) {
        setMsg({ text: 'Şifreniz güvenliğiniz için en az 6 karakter olmalıdır.', success: false });
        return;
      }
    }

    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isSignUp ? 'register' : 'login',
          email: cleanEmail,
          password,
          fullName: isSignUp ? fullName.trim() : undefined,
          guestProfile: isSignUp ? profile : undefined,
          guestFavorites: isSignUp ? favorites : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        setMsg({
          text: data?.error || (isSignUp ? 'Hesap oluşturulamadı.' : 'E-posta adresi veya şifre hatalı.'),
          success: false,
        });
        setLoading(false);
        return;
      }

      // Supabase oturum tokenı döndüyse client oturumunu da senkronize et
      if (isSupabaseConfigured && supabase && data.session?.access_token && data.session?.refresh_token) {
        try {
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });
        } catch (supaErr) {
          console.warn('Supabase session senkron hatası:', supaErr);
        }
      }

      await completeAuthSession(
        data.user.email,
        data.user.fullName,
        data.profile,
        data.favorites,
        data.clientAuthHash
      );

      setMsg({
        text: isSignUp
          ? `Hesabınız başarıyla oluşturuldu, hoş geldiniz ${data.user.fullName}! Yönlendiriliyorsunuz...`
          : `Giriş başarılı! Hoş geldiniz ${data.user.fullName}, yönlendiriliyorsunuz...`,
        success: true,
      });

      setTimeout(() => {
        router.push('/');
      }, 700);
    } catch (err: any) {
      setMsg({
        text: err?.message || 'Sunucuya bağlanırken bir sorun oluştu. Lütfen tekrar deneyin.',
        success: false,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 bg-[#faf8f5]">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-[#e5dfd5] shadow-lg shadow-slate-200/50 space-y-6">
        
        {/* Başlık */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-[#1b4332] flex items-center justify-center text-white mx-auto shadow-sm">
            <Building2 className="w-7 h-7 text-emerald-300" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {isSignUp ? 'Aday Hesabı Oluştur' : 'Aday Giriş Ekranı'}
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            {isSignUp
              ? 'Kriterlerinizi, puanlarınızı ve favori ilanlarınızı kalıcı olarak kaydetmek için yeni hesap oluşturun.'
              : 'Kayıtlı e-posta adresiniz ve şifrenizle hesabınıza güvenle giriş yapın.'}
          </p>
        </div>

        {/* Zaten giriş yapmışsa bilgilendirme banner'ı */}
        {isLoggedIn && userEmail && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between gap-2">
            <div className="truncate">
              <span className="font-bold block">Aktif Oturum:</span>
              <span className="font-mono text-[11px]">{userEmail}</span>
            </div>
            <button
              type="button"
              onClick={async () => {
                await logout();
                setMsg({ text: 'Oturumunuz kapatıldı.', success: true });
              }}
              className="px-2.5 py-1.5 rounded-lg bg-white border border-emerald-200 text-rose-700 hover:bg-rose-50 font-bold text-[11px] flex items-center gap-1 flex-shrink-0"
            >
              <LogOut className="w-3 h-3" />
              <span>Çıkış Yap</span>
            </button>
          </div>
        )}

        {/* Sekme Değiştirici: Giriş Yap / Hesap Oluştur */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setMsg(null);
            }}
            className={`py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              !isSignUp
                ? 'bg-white text-[#1b4332] shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Giriş Yap</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setMsg(null);
            }}
            className={`py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              isSignUp
                ? 'bg-white text-[#1b4332] shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Hesap Oluştur</span>
          </button>
        </div>

        {msg && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2.5 ${
              msg.success
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {msg.success ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            <span>{msg.text}</span>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {/* Ad Soyad SADECE Hesap Oluştururken Sorulur */}
          {isSignUp && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Adınız Soyadınız <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Örn: Ahmet Yılmaz"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  minLength={2}
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:ring-1 focus:ring-[#1b4332] focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              E-Posta Adresi <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                placeholder="ornek@mail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:ring-1 focus:ring-[#1b4332] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Şifre <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={isSignUp ? 6 : 1}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                className="w-full pl-9 pr-10 py-2.5 text-xs rounded-xl border border-slate-200 focus:ring-1 focus:ring-[#1b4332] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                title={showPassword ? 'Şifreyi Gizle' : 'Şifreyi Göster'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {isSignUp && (
              <p className="text-[11px] text-slate-400 mt-1">
                * Şifreniz en az 6 karakter olmalıdır ve sunucuda şifrelenerek saklanır.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-[#1b4332] hover:bg-[#2d6a4f] text-white text-xs font-bold shadow-md shadow-emerald-950/10 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span>{loading ? 'Kontrol ediliyor...' : isSignUp ? 'Hesap Oluştur ve Giriş Yap' : 'Giriş Yap'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="flex flex-col gap-2.5 pt-3 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setMsg(null);
            }}
            className="text-xs font-bold text-[#1b4332] hover:underline"
          >
            {isSignUp
              ? 'Zaten bir hesabınız var mı? Buradan Giriş Yapın'
              : 'Hesabınız yok mu? Buradan Yeni Hesap Oluşturun'}
          </button>

          <Link
            href="/profil"
            className="text-[11px] text-slate-500 hover:text-slate-800 underline font-medium"
          >
            Giriş yapmadan misafir olarak kriterlerimi girmek istiyorum →
          </Link>
        </div>
      </div>
    </div>
  );
}
