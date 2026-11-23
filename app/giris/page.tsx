'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, Mail, Lock, CheckCircle2, AlertCircle, ArrowRight, Zap, UserCheck, ShieldCheck } from 'lucide-react';
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

      // 2. Her koşulda yerel oturum aç ve session'ı kaydet
      const candidateName = fullName || (email.toLowerCase().includes('enes') ? 'Enes Güçlü' : email.split('@')[0]);
      await loginLocal(email, candidateName);

      setMsg({
        text: `Hoş geldiniz Sayın ${candidateName}! Oturumunuz açıldı, ilan akışına yönlendiriliyorsunuz...`,
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

  const handleQuickEnesLogin = async () => {
    setLoading(true);
    await loginLocal('enesguclu@kamuilan.gov.tr', 'Enes Güçlü', {
      education_level: 'LISANS',
      department: 'Bilgisayar Mühendisliği',
      graduation_status: 'MEZUN',
      kpss_type: 'KPSSP3',
      kpss_score: 76.5,
      height: 178,
      weight: 75,
      gender: 'ERKEK',
      military_status: 'MUAFIYET',
    });
    setMsg({
      text: 'Enes Güçlü olarak giriş yapıldı! Bilgisayar Mühendisliği (76.5 KPSS) kriterleriniz yüklendi.',
      success: true,
    });
    setTimeout(() => {
      router.push('/');
    }, 600);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 bg-[#faf8f5]">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-[#e5dfd5] shadow-lg shadow-slate-200/50 space-y-6">
        
        {/* Başlık */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#1b4332] flex items-center justify-center text-white mx-auto shadow-sm">
            <Building2 className="w-6 h-6 text-emerald-300" />
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            {isSignUp ? 'Kamu İlan Hesabı Oluştur' : 'Aday Giriş Paneli'}
          </h1>
          <p className="text-xs text-slate-500">
            Kriterlerinizi ve başvuru takviminizi tüm cihazlarınızda eşitlemek için giriş yapın.
          </p>
        </div>

        {/* 1-Tık Hızlı Giriş Rozeti (Enes Güçlü Kriterleri İçin) */}
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#1b4332]">
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-emerald-600 fill-emerald-600" />
              <span>Tek Tıkla Doğrudan Giriş</span>
            </span>
            <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-mono">
              Hızlı
            </span>
          </div>
          <p className="text-[11px] text-slate-600 leading-snug">
            Enes Güçlü (Bilgisayar Mühendisliği - 76.5 KPSS) kriterleriyle tek tıkla oturum açın:
          </p>
          <button
            type="button"
            onClick={handleQuickEnesLogin}
            disabled={loading}
            className="w-full py-2 px-3 rounded-xl bg-[#1b4332] hover:bg-[#2d6a4f] text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
          >
            <UserCheck className="w-4 h-4 text-emerald-300" />
            <span>Enes Güçlü Olarak Devam Et</span>
          </button>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-200 w-full" />
          <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">veya</span>
        </div>

        {msg && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
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
          {isSignUp && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Adınız Soyadınız</label>
              <input
                type="text"
                placeholder="Örn: Enes Güçlü"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-1 focus:ring-[#1b4332] focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">E-Posta Adresi</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                placeholder="ornek@alan.gov.tr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-1 focus:ring-[#1b4332] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Şifre</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-1 focus:ring-[#1b4332] focus:outline-none"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              * Yerel kullanımda şifre girmeden de doğrudan e-posta ile giriş yapabilirsiniz.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#1b4332] hover:bg-[#2d6a4f] text-white text-xs font-bold shadow-md shadow-emerald-950/10 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span>{loading ? 'İşleniyor...' : isSignUp ? 'Hesap Oluştur ve Giriş Yap' : 'Giriş Yap'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs font-bold text-[#1b4332] hover:underline"
          >
            {isSignUp
              ? 'Zaten bir hesabınız var mı? Giriş Yapın'
              : 'Hesabınız yok mu? Yeni Hesap Oluşturun'}
          </button>

          <Link
            href="/profil"
            className="text-[11px] text-slate-500 hover:text-slate-800 underline font-medium"
          >
            Giriş yapmadan sadece kriterlerimi belirlemek istiyorum →
          </Link>
        </div>
      </div>
    </div>
  );
}
