import React from 'react';
import Link from 'next/link';
import { Building2, Heart, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 text-sm mt-20 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Logo & Description */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white font-bold">
                <Building2 className="w-4 h-4" />
              </div>
              <span className="text-white font-bold text-lg">Kamu İlan</span>
            </div>
            <p className="text-slate-400 text-xs sm:text-sm max-w-md leading-relaxed">
              Resmî Gazete Çeşitli İlanlar ve Cumhurbaşkanlığı Kariyer Kapısı personel alım ilanlarını tek ekranda toplayan, adayların mezuniyet, KPSS, ALES ve YDS puanlarına göre anlık eşleştirme yapan bağımsız kamu ilan platformu.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
              <span className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 border border-slate-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Resmî Gazete & Kariyer Kapısı
              </span>
              <span className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 border border-slate-700">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                Otomatik Güncel İlan Akışı
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-4">Hızlı Erişim</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/" className="hover:text-white transition-colors">Tüm Kamu İlanları</Link>
              </li>
              <li>
                <Link href="/profil" className="hover:text-white transition-colors">Profil ve Kriterlerim</Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-white transition-colors">Manuel İlan Ekle</Link>
              </li>
              <li>
                <a href="https://www.resmigazete.gov.tr" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Resmî Gazete Çeşitli İlanlar</a>
              </li>
              <li>
                <a href="https://www.turkiye.gov.tr/kariyer-kapisi-kamu-ise-alim" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Cumhurbaşkanlığı Kariyer Kapısı (e-Devlet)</a>
              </li>
            </ul>
          </div>

          {/* System Info */}
          <div>
            <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-4">Akıllı Eşleştirme</h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Profilinizdeki eğitim seviyesi, YÖK bölümünüz, KPSS/ALES puanınız ve yabancı dil seviyeniz kadro şartlarıyla deterministik olarak kıyaslanır; uygun kadrolar yeşil rozetle öne çıkarılır.
            </p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-[11px] border border-slate-700">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              <span>Güvenli & Ücretsiz Açık Platform</span>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} Kamu İlan. Tüm hakları saklıdır.</p>
          <p className="flex items-center gap-1">
            Kamu personeli ve memur adayları için geliştirildi <Heart className="w-3.5 h-3.5 text-rose-500 inline fill-rose-500" />
          </p>
        </div>
      </div>
    </footer>
  );
}
