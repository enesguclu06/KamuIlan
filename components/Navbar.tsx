'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Building2, 
  UserCheck, 
  Sparkles, 
  Menu, 
  X, 
  ShieldCheck, 
  Compass,
  GraduationCap,
  SlidersHorizontal,
  LogIn,
  LogOut
} from 'lucide-react';
import { useUserProfile } from '@/lib/context/user-profile-context';

export function Navbar() {
  const pathname = usePathname();
  const { profile, hasProfileFilled, isLoggedIn, userEmail, logout } = useUserProfile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Kamu İlanları', icon: Compass },
    { href: '/profil', label: 'Kriterlerim & CV', icon: UserCheck },
    { href: '/admin', label: 'İlan Ekle (AI)', icon: ShieldCheck },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Slogan */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-lg leading-tight">
                <span>Kamuİlan</span>
                <span className="text-sky-600">AI</span>
                <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 tracking-wider">Memur & Personel</span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">Akıllı Kamu Alım Takip ve Eşleştirme</p>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-sky-50 text-sky-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-sky-600' : 'text-slate-400'}`} />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Profile Status Pill & Auth */}
          <div className="hidden md:flex items-center gap-3">
            {hasProfileFilled && profile ? (
              <Link
                href="/profil"
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 border border-slate-300 transition-colors shadow-sm"
                title="Kriterlerinizi Düzenleyin"
              >
                <GraduationCap className="w-4 h-4 text-sky-600" />
                <span className="max-w-[130px] truncate">{profile.department || profile.education_level}</span>
                {profile.kpss_score ? (
                  <span className="px-1.5 py-0.5 rounded bg-white font-mono text-[11px] text-slate-900 border border-slate-200 font-bold">
                    KPSS: {profile.kpss_score}
                  </span>
                ) : null}
                {profile.ales_score ? (
                  <span className="px-1.5 py-0.5 rounded bg-amber-100 font-mono text-[11px] text-amber-900 font-bold">
                    ALES: {profile.ales_score}
                  </span>
                ) : null}
              </Link>
            ) : (
              <Link
                href="/profil"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-sky-600/20 transition-all hover:scale-105"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Kriterlerini Gir (İlanları Eşle)</span>
              </Link>
            )}

            {/* Auth Link */}
            {isLoggedIn ? (
              <button
                onClick={logout}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 px-2 py-1.5 transition-colors"
                title="Hesaptan Çıkış Yap"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Çıkış</span>
              </button>
            ) : (
              <Link
                href="/giris"
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-sky-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Giriş Yap</span>
              </Link>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold ${
                  isActive ? 'bg-sky-50 text-sky-700' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-5 h-5 text-sky-600" />
                {link.label}
              </Link>
            );
          })}
          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            <Link
              href="/profil"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-sky-600 text-white text-xs font-bold shadow-sm"
            >
              <UserCheck className="w-4 h-4" />
              {hasProfileFilled ? 'Kriterlerimi Düzenle' : 'Kriterlerimi Gir (Eşleştirmeyi Başlat)'}
            </Link>
            <Link
              href="/giris"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center w-full py-2 px-3 rounded-lg bg-slate-100 text-slate-800 text-xs font-semibold"
            >
              {isLoggedIn ? 'Hesabım / Çıkış' : 'Giriş Yap / Kayıt Ol'}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
