import React from 'react';
import Link from 'next/link';
import { FileQuestion, ArrowLeft, Compass } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-[75vh] bg-[#faf8f5] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full bg-white rounded-3xl border border-[#e5dfd5] p-8 sm:p-10 text-center shadow-sm space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-[#1b4332] flex items-center justify-center mx-auto">
          <FileQuestion className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">
            Hata 404
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Sayfa veya İlan Bulunamadı
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            Aradığınız sayfa taşınmış, süresi dolmuş veya bağlantı hatalı olabilir. Güncel tüm kamu ilanlarını ana sayfadan inceleyebilirsiniz.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#1b4332] hover:bg-[#2d6a4f] text-white text-xs font-bold shadow-sm transition-all"
          >
            <Compass className="w-4 h-4 text-emerald-300" />
            <span>Tüm İlanlara Git</span>
          </Link>
          <Link
            href="/profil"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kriterlerim & CV</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
