'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Building2, 
  UserCheck, 
  Sparkles, 
  Bell, 
  Send, 
  Menu, 
  X, 
  ShieldCheck, 
  Compass,
  GraduationCap
} from 'lucide-react';
import { useUserProfile } from '@/lib/context/user-profile-context';

export function Navbar() {
  const pathname = usePathname();
  const { profile, isLoggedIn, userEmail, logout } = useUserProfile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'İlan Akışı', icon: Compass },
    { href: '/profil', label: 'Profilim & Kriterler', icon: UserCheck },
    { href: '/admin', label: 'Admin & Manuel İlan', icon: ShieldCheck },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
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
                <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 tracking-wider">Ücretsiz</span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">Akıllı Memur & Personel İlan Takibi</p>
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

          {/* Profile Pill & Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {profile && profile.department ? (
              <Link
                href="/profil"
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 border border-slate-200 transition-colors"
                title="Profil Kriterleriniz"
              >
                <GraduationCap className="w-3.5 h-3.5 text-sky-600" />
                <span className="max-w-[130px] truncate">{profile.department}</span>
                {profile.kpss_score ? (
                  <span className="px-1.5 py-0.5 rounded bg-white font-mono text-[11px] text-slate-900 border border-slate-200">
                    KPSS: {profile.kpss_score}
                  </span>
                ) : null}
              </Link>
            ) : null}

            {/* Telegram Link */}
            <a
              href="https://t.me"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold shadow-sm transition-colors"
              title="Anlık Telegram Bildirimi"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Telegram Bot</span>
            </a>

            {/* Auth Link */}
            {isLoggedIn ? (
              <button
                onClick={logout}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
              >
                Çıkış ({userEmail?.split('@')[0]})
              </button>
            ) : (
              <Link
                href="/giris"
                className="text-xs font-semibold text-slate-700 hover:text-sky-600 px-2 py-1.5 transition-colors"
              >
                Giriş Yap
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
              className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg bg-slate-100 text-xs font-semibold text-slate-800"
            >
              <UserCheck className="w-4 h-4 text-sky-600" />
              Profilimi Düzenle ({profile?.department || 'Bölüm Seçilmedi'})
            </Link>
            <Link
              href="/giris"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center w-full py-2 px-3 rounded-lg bg-sky-600 text-white text-xs font-semibold"
            >
              {isLoggedIn ? 'Hesabım' : 'Giriş Yap / Kayıt Ol'}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
