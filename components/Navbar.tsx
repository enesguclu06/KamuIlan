'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Building2, 
  UserCheck, 
  Menu, 
  X, 
  ShieldCheck, 
  Compass,
  Calendar,
  Heart,
  Bell,
  ChevronDown,
  User,
  SlidersHorizontal,
  LogIn,
  LogOut,
  Sparkles
} from 'lucide-react';
import { useUserProfile } from '@/lib/context/user-profile-context';

export function Navbar() {
  const pathname = usePathname();
  const { profile, hasProfileFilled, isLoggedIn, userEmail, logout } = useUserProfile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const isUserActive = isLoggedIn || hasProfileFilled;

  const navLinks = isUserActive
    ? [
        { href: '/', label: 'İlanlar', icon: Compass },
        { href: '/profil', label: 'Kriterlerim & CV', icon: UserCheck },
      ]
    : [
        { href: '/', label: 'İlanlar', icon: Compass },
        { href: '/tanitim', label: 'Tanıtım', icon: Sparkles },
        { href: '/profil', label: 'Kriterlerimi Gir', icon: UserCheck },
      ];

  const displayName = profile?.full_name || (userEmail ? userEmail.split('@')[0] : (isLoggedIn ? 'Kullanıcı' : ''));

  return (
    <header className="sticky top-0 z-50 bg-[#faf8f5] border-b border-[#ece7df] text-slate-800">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-[#1b4332] text-white flex items-center justify-center font-black shadow-sm group-hover:scale-105 transition-transform">
              <Building2 className="w-5 h-5 text-emerald-300" />
            </div>
            <div className="flex items-center">
              <span className="font-black text-xl text-[#1b4332] tracking-tight">kamu</span>
              <span className="font-extrabold text-xl text-[#2d6a4f] tracking-tight">ilan</span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1.5 bg-[#f2eee9] p-1 rounded-full border border-[#e5dfd5]">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-white text-[#1b4332] shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Section: Notification & User Dropdown */}
          <div className="hidden md:flex items-center gap-3">
            {/* Bildirim Çanı */}
            <button
              type="button"
              className="relative p-2 rounded-full hover:bg-[#ece7df] text-slate-600 transition-colors"
              title="Bildirimler"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center">
                19
              </span>
            </button>

            {isUserActive ? (
              /* Kullanıcı / Aday Menüsü */
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 py-1.5 px-3 rounded-full hover:bg-[#ece7df] text-xs font-bold text-slate-800 transition-colors border border-transparent hover:border-[#e5dfd5]"
                >
                  <div className="w-7 h-7 rounded-full bg-[#1b4332] text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                    {(displayName || 'A').slice(0, 1)}
                  </div>
                  <span>{displayName || 'Hesabım'}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 text-xs">
                    <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/60 rounded-t-2xl">
                      <p className="font-bold text-slate-900">{displayName || 'Kullanıcı'}</p>
                      <p className="text-[11px] text-[#2d6a4f] font-semibold truncate">
                        {profile?.department || (isLoggedIn ? 'Oturum Açık' : 'Kriterler Kayıtlı')}
                      </p>
                      {profile?.kpss_score && (
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {profile.kpss_type || 'KPSS'}: {profile.kpss_score} Puan
                        </p>
                      )}
                    </div>
                    <Link
                      href="/profil"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 text-slate-700 font-semibold"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-700" />
                      Kriterlerimi Düzenle
                    </Link>
                    <Link
                      href="/favoriler"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 text-slate-700 font-semibold"
                    >
                      <Heart className="w-3.5 h-3.5 text-rose-500" />
                      Favori İlanlarım
                    </Link>
                    <div className="border-t border-slate-100 my-1" />
                    <Link
                      href="/admin"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 text-slate-500 font-semibold text-[11px]"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                      Yönetici Paneli
                    </Link>
                    <div className="border-t border-slate-100 my-1" />
                    {isLoggedIn ? (
                      <button
                        onClick={() => {
                          logout();
                          setUserDropdownOpen(false);
                        }}
                        className="flex items-center gap-2 w-full text-left px-4 py-2 hover:bg-rose-50 text-rose-600 font-semibold"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Çıkış Yap
                      </button>
                    ) : (
                      <Link
                        href="/giris"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 hover:bg-emerald-50 text-[#1b4332] font-semibold"
                      >
                        <LogIn className="w-3.5 h-3.5 text-[#1b4332]" />
                        Oturum Aç / Eşitle
                      </Link>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Henüz Kriter Belirlememiş / Giriş Yapmamış Ziyaretçi */
              <div className="flex items-center gap-2">
                <Link
                  href="/profil"
                  className="px-3.5 py-1.5 rounded-full text-xs font-bold text-[#1b4332] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center gap-1.5"
                >
                  <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Kriter Belirle</span>
                </Link>
                <Link
                  href="/giris"
                  className="px-4 py-1.5 rounded-full text-xs font-bold text-white bg-[#1b4332] hover:bg-[#2d6a4f] shadow-sm transition-all flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Giriş Yap</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-700 hover:bg-slate-200"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#ece7df] bg-[#faf8f5] px-4 pt-3 pb-5 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-[#ece7df]"
            >
              <link.icon className="w-4 h-4 text-[#2d6a4f]" />
              {link.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-[#ece7df] flex flex-col gap-2">
            {isUserActive ? (
              <>
                <Link
                  href="/profil"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#1b4332] text-white text-xs font-bold text-center"
                >
                  Kriterlerimi Düzenle ({displayName || 'Profilim'})
                </Link>
                {isLoggedIn && (
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold text-center border border-rose-200"
                  >
                    Çıkış Yap
                  </button>
                )}
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/profil"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 px-3 rounded-xl bg-emerald-50 text-[#1b4332] text-xs font-bold text-center border border-emerald-200"
                >
                  Kriter Belirle
                </Link>
                <Link
                  href="/giris"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 px-3 rounded-xl bg-[#1b4332] text-white text-xs font-bold text-center shadow-sm"
                >
                  Giriş Yap
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
