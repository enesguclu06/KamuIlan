'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  const { profile, hasProfileFilled, isLoggedIn, userEmail, logout, favorites } = useUserProfile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);

  const notificationsRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        // Desktop dışı tıklandığında kapat
        setNotificationsOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const NOTIFICATIONS = [
    {
      id: 'notif-1',
      title: 'Sayıştay Başkanlığı Son Başvuru!',
      desc: 'Sözleşmeli Çözümleyici ve Programcı alımı için son başvuru tarihi: 25 Kasım 2026 (1 gün kaldı).',
      tag: 'Son Başvuru',
      time: 'Bugün',
      href: '/ilan/ann-sayistay-1',
      color: 'amber',
      unread: true,
    },
    {
      id: 'notif-2',
      title: 'İçişleri Bakanlığı 1.170 Personel Alımı',
      desc: 'Merkez ve 81 il taşra teşkilatına 1.170 personel alımı başvuruları 7 Aralık tarihinde Kariyer Kapısı üzerinden açılacaktır.',
      tag: 'Gelecek İlan',
      time: 'Bugün',
      href: '/ilan/ann-icisleri-1',
      color: 'blue',
      unread: true,
    },
    {
      id: 'notif-3',
      title: 'Savunma Sanayii Başkanlığı (SSB)',
      desc: '26 Proje Bazlı Sözleşmeli Personel alımı Kariyer Kapısı üzerinden başvuru kabul etmektedir.',
      tag: 'Kariyer Kapısı',
      time: 'Dün',
      href: '/ilan/ann-ssb-1',
      color: 'emerald',
      unread: true,
    },
    {
      id: 'notif-4',
      title: 'Adli Tıp Kurumu 181 Personel',
      desc: 'Mühendis, Kimyager, Tekniker ve Güvenlik alımı başvuruları 30 Kasım - 6 Aralık tarihleri arasında alınacaktır.',
      tag: 'Yakında Başlıyor',
      time: '2 gün önce',
      href: '/ilan/ann-atk-1',
      color: 'purple',
      unread: false,
    },
  ];

  const unreadCount = NOTIFICATIONS.filter(n => !readNotificationIds.includes(n.id) && n.unread).length;

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

  const renderNotificationsContent = () => (
    <div className="w-full max-w-sm sm:max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 py-3 text-xs">
      {/* Başlık */}
      <div className="px-4 pb-2.5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-slate-900 text-sm">Bildirimler</span>
          {unreadCount > 0 && (
            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
              {unreadCount} Yeni
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => setReadNotificationIds(NOTIFICATIONS.map(n => n.id))}
            className="text-[11px] text-[#1b4332] font-bold hover:underline"
          >
            Tümünü Okundu Say
          </button>
        )}
      </div>

      {/* Bildirim Listesi */}
      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
        {NOTIFICATIONS.map((notif) => {
          const isRead = readNotificationIds.includes(notif.id) || !notif.unread;
          return (
            <Link
              key={notif.id}
              href={notif.href}
              onClick={() => {
                if (!readNotificationIds.includes(notif.id)) {
                  setReadNotificationIds(prev => [...prev, notif.id]);
                }
                setNotificationsOpen(false);
              }}
              className={`block p-3.5 hover:bg-slate-50 transition-colors ${
                !isRead ? 'bg-amber-50/40' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-bold text-slate-900 text-xs">
                  {notif.title}
                </span>
                <span className="text-[10px] text-slate-400 whitespace-nowrap">
                  {notif.time}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                {notif.desc}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${
                  notif.color === 'blue'
                    ? 'bg-blue-100 text-blue-800'
                    : notif.color === 'amber'
                    ? 'bg-amber-100 text-amber-900'
                    : notif.color === 'emerald'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-purple-100 text-purple-800'
                }`}>
                  {notif.tag}
                </span>
                {!isRead && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Alt Bilgi */}
      <div className="pt-2 px-4 border-t border-slate-100 text-center">
        <Link
          href="/"
          onClick={() => setNotificationsOpen(false)}
          className="text-[11px] font-bold text-[#1b4332] hover:underline"
        >
          Tüm Güncel İlanları Görüntüle →
        </Link>
      </div>
    </div>
  );

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

          {/* Right Section: Notification, Favorites & User Dropdown */}
          <div className="hidden md:flex items-center gap-2">
            {/* Favoriler Butonu */}
            <Link
              href="/favoriler"
              className="relative p-2 rounded-full hover:bg-[#ece7df] text-slate-600 transition-colors"
              title="Favori İlanlarım"
            >
              <Heart className={`w-5 h-5 ${favorites.length > 0 ? 'fill-rose-500 text-rose-500' : 'text-slate-600'}`} />
              {favorites.length > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center">
                  {favorites.length}
                </span>
              )}
            </Link>

            {/* Bildirim Çanı & Popover */}
            <div ref={notificationsRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                  if (userDropdownOpen) setUserDropdownOpen(false);
                }}
                className={`relative p-2 rounded-full transition-colors ${
                  notificationsOpen ? 'bg-[#ece7df] text-slate-900' : 'hover:bg-[#ece7df] text-slate-600'
                }`}
                title="Bildirimler"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 z-50">
                  {renderNotificationsContent()}
                </div>
              )}
            </div>

            {isUserActive ? (
              /* Kullanıcı / Aday Menüsü */
              <div ref={userDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setUserDropdownOpen(!userDropdownOpen);
                    if (notificationsOpen) setNotificationsOpen(false);
                  }}
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
                      className="flex items-center justify-between px-4 py-2 hover:bg-slate-50 text-slate-700 font-semibold"
                    >
                      <div className="flex items-center gap-2">
                        <Heart className="w-3.5 h-3.5 text-rose-500" />
                        <span>Favori İlanlarım</span>
                      </div>
                      {favorites.length > 0 && (
                        <span className="text-[10px] bg-rose-100 text-rose-700 font-mono font-bold px-1.5 py-0.5 rounded-full">
                          {favorites.length}
                        </span>
                      )}
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

          {/* Mobile Actions: Favoriler, Bildirimler & Menü */}
          <div className="flex md:hidden items-center gap-1">
            <Link
              href="/favoriler"
              className="relative p-2 rounded-full hover:bg-[#ece7df] text-slate-600 transition-colors"
              title="Favori İlanlarım"
            >
              <Heart className={`w-5 h-5 ${favorites.length > 0 ? 'fill-rose-500 text-rose-500' : 'text-slate-600'}`} />
              {favorites.length > 0 && (
                <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                  {favorites.length}
                </span>
              )}
            </Link>

            <button
              type="button"
              onClick={() => {
                setNotificationsOpen(!notificationsOpen);
                if (mobileMenuOpen) setMobileMenuOpen(false);
              }}
              className={`relative p-2 rounded-full transition-colors ${
                notificationsOpen ? 'bg-[#ece7df] text-slate-900' : 'hover:bg-[#ece7df] text-slate-600'
              }`}
              title="Bildirimler"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(!mobileMenuOpen);
                if (notificationsOpen) setNotificationsOpen(false);
              }}
              className="p-2 rounded-lg text-slate-700 hover:bg-slate-200"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobil Bildirim Paneli Açılır Kartı */}
      {notificationsOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[1px] md:hidden"
            onClick={() => setNotificationsOpen(false)}
          />
          <div className="md:hidden fixed top-16 left-3 right-3 z-50 flex justify-center">
            {renderNotificationsContent()}
          </div>
        </>
      )}

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
            {/* Mobil Bildirimler */}
            <button
              type="button"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-amber-50/70 border border-amber-200"
            >
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-600" />
                <span>Bildirimler & Son Gelişmeler</span>
              </div>
              {unreadCount > 0 && (
                <span className="text-[10px] bg-amber-200 text-amber-900 font-mono px-2 py-0.5 rounded-full">
                  {unreadCount} Yeni
                </span>
              )}
            </button>
            {notificationsOpen && (
              <div className="bg-white rounded-xl border border-slate-200 p-2 space-y-2 max-h-60 overflow-y-auto">
                {NOTIFICATIONS.map((notif) => (
                  <Link
                    key={notif.id}
                    href={notif.href}
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setNotificationsOpen(false);
                    }}
                    className="block p-2 rounded-lg hover:bg-slate-50 border-b border-slate-100 last:border-0"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">{notif.title}</span>
                      <span className="text-[9px] text-slate-400">{notif.time}</span>
                    </div>
                    <p className="text-[10px] text-slate-600 line-clamp-1 mt-0.5">{notif.desc}</p>
                  </Link>
                ))}
              </div>
            )}
            <Link
              href="/favoriler"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-rose-50/70 border border-rose-200"
            >
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                <span>Favori İlanlarım</span>
              </div>
              <span className="text-[10px] bg-rose-200 text-rose-800 font-mono px-2 py-0.5 rounded-full">
                {favorites.length}
              </span>
            </Link>
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
