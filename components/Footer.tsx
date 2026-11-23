import React from 'react';
import Link from 'next/link';
import { Building2, Heart, ShieldCheck, Zap } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 text-sm mt-20 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Logo & Description */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center text-white font-bold">
                <Building2 className="w-4 h-4" />
              </div>
              <span className="text-white font-bold text-lg">Kamuİlan AI</span>
            </div>
            <p className="text-slate-400 text-xs sm:text-sm max-w-md leading-relaxed">
              Resmî Gazete ve Kariyer Kapısı alımlarını yapay zeka ile ayrıştırıp adayların eğitim, KPSS ve kriterleriyle eşleştiren %100 ücretsiz kamu ilan takip platformu.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
              <Zap className="w-4 h-4" />
              <span>%100 Ücretsiz Altyapı (Next.js + Supabase + Gemini 2.5 Flash + Telegram API)</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-4">Hızlı Erişim</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/" className="hover:text-white transition-colors">Tüm İlanlar</Link>
              </li>
              <li>
                <Link href="/profil" className="hover:text-white transition-colors">Profil ve Kriter Sihirbazı</Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-white transition-colors">Manuel İlan Ekleme (AI)</Link>
              </li>
              <li>
                <a href="https://www.resmigazete.gov.tr" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Resmî Gazete Çeşitli İlanlar</a>
              </li>
              <li>
                <a href="https://isealimkariyerkapisi.cbiko.gov.tr" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Cumhurbaşkanlığı Kariyer Kapısı</a>
              </li>
            </ul>
          </div>

          {/* System Info */}
          <div>
            <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-4">Otomasyon</h4>
            <p className="text-xs text-slate-400 mb-2">
              GitHub Actions botu her gün <strong>08:30 ve 18:30 TSİ</strong>'de Resmî Gazete'yi tarayarak uygun adaylara anında Telegram bildirimi iletir.
            </p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-[11px] border border-slate-700">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              <span>Free Tier Uyumlu (0 TL)</span>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} Kamuİlan AI. Açık kaynak kamu hizmeti girişimi.</p>
          <p className="flex items-center gap-1">
            Yapay Zeka ve Veri Mühendisliği ile geliştirildi <Heart className="w-3.5 h-3.5 text-red-500 inline fill-red-500" />
          </p>
        </div>
      </div>
    </footer>
  );
}
