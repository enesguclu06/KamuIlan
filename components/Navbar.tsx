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
  PlusCircle,
  Sparkles
} from 'lucide-react';
import { useUserProfile } from '@/lib/context/user-profile-context';

export function Navbar() {
  const pathname = usePathname();
  const { profile, hasProfileFilled, isLoggedIn, logout } = useUserProfile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'İlanlar', icon: Compass },
    { href: '/tanitim', label: 'Tanıtım', icon: Sparkles },
    { href: '/profil', label: 'Kriterlerim & CV', icon: UserCheck },
    { href: '/admin', label: 'İlan Ekle / Tara', icon: PlusCircle },
  ];

  const displayName = profile?.full_name || (isLoggedIn ? 'Kullanıcı' : 'Enes Güçlü');

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

            {/* Kullanıcı Menüsü */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 py-1.5 px-3 rounded-full hover:bg-[#ece7df] text-xs font-bold text-slate-800 transition-colors border border-transparent hover:border-[#e5dfd5]"
              >
                <div className="w-7 h-7 rounded-full bg-[#2d6a4f] text-white flex items-center justify-center font-bold text-xs uppercase">
                  {displayName.slice(0, 1)}
                </div>
                <span>{displayName}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 text-xs">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="font-bold text-slate-900">{displayName}</p>
                    <p className="text-[11px] text-slate-500 truncate">{profile?.department || 'Bölüm Tanımsız'}</p>
                  </div>
                  <Link
                    href="/profil"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 text-slate-700 font-semibold"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-sky-600" />
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
                      className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 text-slate-700 font-semibold"
                    >
                      <LogIn className="w-3.5 h-3.5 text-slate-500" />
                      Giriş Yap / Kaydol
                    </Link>
                  )}
                </div>
              )}
            </div>
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
            <Link
              href="/profil"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-2.5 px-3 rounded-xl bg-[#1b4332] text-white text-xs font-bold text-center"
            >
              Kriterlerimi Düzenle ({displayName})
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
