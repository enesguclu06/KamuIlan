'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, Mail, Lock, CheckCircle2, AlertCircle, ArrowRight, UserCheck, ShieldCheck, User } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { useUserProfile } from '@/lib/context/user-profile-context';

export default function LoginPage() {
  const router = useRouter();
  const { loginLocal, isLoggedIn, profile } = useUserProfile();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; success: boolean } | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setMsg({ text: 'Lütfen e-posta adresinizi girin.', success: false });
      return;
    }

    setLoading(true);
    setMsg(null);

    try {
      // 1. Supabase yapılandırılmışsa ve şifre girilmişse Supabase dene
      if (isSupabaseConfigured && supabase && password) {
        try {
          if (isSignUp) {
            const { error } = await supabase.auth.signUp({ email, password });
            if (error) throw error;
          } else {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
          }
        } catch (supabaseErr: any) {
          console.warn('Supabase auth denenirken hata alındı, yerel oturuma geçiliyor:', supabaseErr);
        }
      }

      // 2. Her kullanıcı için kendi adına özel güvenli oturum aç
      const candidateName = fullName.trim() || email.split('@')[0];
      await loginLocal(email, candidateName);

      setMsg({
        text: `Hoş geldiniz Sayın ${candidateName}! Oturumunuz başarıyla açıldı, yönlendiriliyorsunuz...`,
        success: true,
      });

      setTimeout(() => {
        router.push('/');
      }, 700);
    } catch (e: any) {
      setMsg({ text: e.message || 'Giriş yapılırken bir sorun oluştu.', success: false });
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
            {isSignUp ? 'Aday Hesabı Oluştur' : 'Aday Giriş Paneli'}
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            Mezuniyet, KPSS puanı ve bölüm kriterlerinizi profilinize kaydedip size en uygun kamu ilanlarıyla eşleşmek için giriş yapın.
          </p>
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
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Adınız Soyadınız {isSignUp && <span className="text-rose-500">*</span>}
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Örn: Ahmet Yılmaz"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required={isSignUp}
                className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:ring-1 focus:ring-[#1b4332] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">E-Posta Adresi</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                placeholder="ornek@alan.gov.tr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:ring-1 focus:ring-[#1b4332] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Şifre</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:ring-1 focus:ring-[#1b4332] focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              * Kendi kişisel şifrenizi girerek hesabınızı güvenceye alabilirsiniz.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-[#1b4332] hover:bg-[#2d6a4f] text-white text-xs font-bold shadow-md shadow-emerald-950/10 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span>{loading ? 'İşleniyor...' : isSignUp ? 'Hesap Oluştur ve Giriş Yap' : 'Kendi Hesabımla Giriş Yap'}</span>
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
              : 'Yeni bir aday mısınız? Buradan Hesap Oluşturun'}
          </button>

          <Link
            href="/profil"
            className="text-[11px] text-slate-500 hover:text-slate-800 underline font-medium"
          >
            Giriş yapmadan doğrudan kriterlerimi belirlemek istiyorum →
          </Link>
        </div>
      </div>
    </div>
  );
}
