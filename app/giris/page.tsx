'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, Mail, Lock, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; success: boolean } | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setMsg({ text: 'Lütfen e-posta ve şifrenizi girin.', success: false });
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setMsg({
        text: 'Supabase yapılandırılana kadar kriterlerinizi "Kriterlerim & CV" sekmesinde yerel olarak saklayabilirsiniz!',
        success: true,
      });
      return;
    }

    setLoading(true);
    setMsg(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg({ text: 'Kayıt başarılı! Giriş yapabilirsiniz.', success: true });
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setMsg({ text: 'Giriş başarılı! Yönlendiriliyorsunuz...', success: true });
        setTimeout(() => router.push('/'), 1000);
      }
    } catch (e: any) {
      setMsg({ text: e.message || 'Kimlik doğrulama hatası.', success: false });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-[#faf8f5]">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-[#e5dfd5] shadow-sm space-y-6">
        
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#1b4332] flex items-center justify-center text-white mx-auto shadow-sm">
            <Building2 className="w-6 h-6 text-emerald-300" />
          </div>
          <h1 className="text-xl font-black text-slate-900">
            {isSignUp ? 'Kamu İlan Hesabı Oluştur' : 'Kamu İlan Girişi'}
          </h1>
          <p className="text-xs text-slate-500">
            Kriterlerinizi ve başvuru takviminizi tüm cihazlarınızda eşitlemek için giriş yapın.
          </p>
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
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-1 focus:ring-[#1b4332] focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#1b4332] hover:bg-[#2d6a4f] text-white text-xs font-bold shadow-md shadow-emerald-950/10 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span>{loading ? 'İşleniyor...' : isSignUp ? 'Hesap Oluştur' : 'Giriş Yap'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs font-bold text-[#1b4332] hover:underline"
          >
            {isSignUp
              ? 'Zaten bir hesabınız var mı? Giriş Yapın'
              : 'Hesabınız yok mu? Yeni Hesap Oluşturun'}
          </button>
        </div>
      </div>
    </div>
  );
}
