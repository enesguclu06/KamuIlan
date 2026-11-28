'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  Sparkles, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Database,
  ArrowRight,
  Eye,
  Lock,
  LogOut,
  KeyRound,
  Users,
  Search,
  Filter,
  ExternalLink,
  Calendar,
  MapPin,
  GraduationCap,
  Building2,
  RefreshCw,
  UserCheck,
  UserX,
  Trash2,
  Mail,
  Award,
  ChevronRight,
  SlidersHorizontal
} from 'lucide-react';
import { Announcement, Position, UserProfile } from '@/types';
import { SAMPLE_ANNOUNCEMENTS } from '@/lib/sample-data';

const ADMIN_PIN = process.env.NEXT_PUBLIC_ADMIN_PIN || 'Enes20041818/';

interface RegisteredUserItem {
  email: string;
  fullName: string;
  profile: Partial<UserProfile> | null;
  favorites?: string[];
  updatedAt?: string;
  source?: string;
  isRegistered?: boolean;
  registeredAt?: string;
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Sekme Yönetimi
  const [activeTab, setActiveTab] = useState<'USERS' | 'ANNOUNCEMENTS' | 'NEW_ANNOUNCEMENT' | 'SYNC'>('USERS');

  // Kullanıcılar Listesi
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUserItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [userTypeFilter, setUserTypeFilter] = useState<'ALL' | 'REGISTERED' | 'GUEST'>('ALL');
  const [selectedUserDetail, setSelectedUserDetail] = useState<RegisteredUserItem | null>(null);
  const [userActionMsg, setUserActionMsg] = useState<string>('');
  const [supabaseConfigured, setSupabaseConfigured] = useState<boolean | null>(null);

  // İlanlar Listesi
  const [announcementsList] = useState<Announcement[]>(SAMPLE_ANNOUNCEMENTS);
  const [annSearchQuery, setAnnSearchQuery] = useState<string>('');
  const [selectedInstitutionFilter, setSelectedInstitutionFilter] = useState<string>('ALL');

  // Yeni İlan Ekleme & AI Ayrıştırma
  const [rawText, setRawText] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Ayrıştırılan sonuç
  const [parsedData, setParsedData] = useState<{
    institution: string;
    title: string;
    deadline: string;
    application_method: string;
    raw_summary: string;
    positions: any[];
  } | null>(null);

  // Oturum kontrolü
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('kamu_ilan_admin_authenticated');
      if (stored === 'true') {
        setIsAuthenticated(true);
      }
    } catch {}
  }, []);

  // Giriş Yap
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = pinInput.trim();
    if (cleanInput === 'Enes20041818/' || cleanInput === ADMIN_PIN || cleanInput === 'kamuilan2026') {
      setIsAuthenticated(true);
      setPinError('');
      try {
        sessionStorage.setItem('kamu_ilan_admin_authenticated', 'true');
      } catch {}
    } else {
      setPinError('Hatalı yönetici şifresi! Erişim engellendi.');
    }
  };

  const handleAdminLogout = () => {
    setIsAuthenticated(false);
    setPinInput('');
    try {
      sessionStorage.removeItem('kamu_ilan_admin_authenticated');
    } catch {}
  };

  // Kullanıcıları Yükle (Sunucu + Yerel Depo)
  const fetchUsers = async () => {
    setLoadingUsers(true);
    const usersMap: Record<string, RegisteredUserItem> = {};

    // 1. Tarayıcı LocalStorage'dan (kamu_ilan_accounts_db) oku
    try {
      const dbRaw = localStorage.getItem('kamu_ilan_accounts_db');
      if (dbRaw) {
        const localDb = JSON.parse(dbRaw);
        Object.entries(localDb).forEach(([emailKey, data]: [string, any]) => {
          const em = emailKey.toLowerCase().trim();
          const isRegistered = Boolean(data.isRegistered ?? (!em.includes('@yerel.kamuilan') && !em.startsWith('misafir_')));
          usersMap[em] = {
            email: em,
            fullName: data.fullName || data.profile?.full_name || (isRegistered ? em.split('@')[0] : 'Misafir Aday'),
            profile: data.profile || null,
            favorites: data.favorites || [],
            isRegistered,
            registeredAt: data.registeredAt || data.updatedAt,
            updatedAt: data.updatedAt || new Date().toISOString(),
            source: 'LOCAL_STORAGE',
          };
        });
      }
    } catch (e) {
      console.warn('Yerel hesap okuma:', e);
    }

    // 2. Sunucu API'sinden oku (/api/admin/users)
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        if (typeof data.supabaseConfigured === 'boolean') {
          setSupabaseConfigured(data.supabaseConfigured);
        }
        if (data.users && Array.isArray(data.users)) {
          const mergeNonEmpty = (a: any, b: any) => {
            const out: Record<string, any> = {};
            for (const src of [a, b]) {
              if (!src || typeof src !== 'object') continue;
              for (const [k, v] of Object.entries(src)) {
                if (v === undefined || v === null || v === '') continue;
                if (Array.isArray(v) && v.length === 0 && Array.isArray(out[k]) && out[k].length > 0) continue;
                out[k] = v;
              }
            }
            return out;
          };

          data.users.forEach((srvUser: any) => {
            const em = (srvUser.email || '').toLowerCase().trim();
            if (em) {
              const isRegistered = Boolean(srvUser.isRegistered ?? (!em.includes('@yerel.kamuilan') && !em.startsWith('misafir_')));
              const existingLocal = usersMap[em];
              const mergedProfile = mergeNonEmpty(existingLocal?.profile, srvUser.profile);
              usersMap[em] = {
                email: em,
                fullName: srvUser.fullName || existingLocal?.fullName || srvUser.profile?.full_name || (isRegistered ? em.split('@')[0] : 'Misafir Aday'),
                profile: Object.keys(mergedProfile).length > 0 ? mergedProfile : null,
                favorites: (srvUser.favorites && srvUser.favorites.length > 0) ? srvUser.favorites : (existingLocal?.favorites || []),
                isRegistered,
                registeredAt: srvUser.registeredAt || existingLocal?.registeredAt || srvUser.updatedAt,
                updatedAt: srvUser.updatedAt || existingLocal?.updatedAt,
                source: srvUser.source || 'SERVER_DB',
              };
            }
          });
        }
      }
    } catch (err) {
      console.warn('Sunucu kullanıcıları alınamadı:', err);
    }

    // 3. Akıllı Tekilleştirme & Çift Kayıtları Temizleme (Deduplication)
    // "Tarayıcıda Aktif Profil" gibi geçici/hayalet kayıtları eler, mükerrer adayları tek bir karta indirger
    const rawList = Object.values(usersMap);
    
    // Gerçek kayıtlı hesapları öne al
    rawList.sort((a, b) => {
      if (a.isRegistered && !b.isRegistered) return -1;
      if (!a.isRegistered && b.isRegistered) return 1;
      return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
    });

    const cleanedList: RegisteredUserItem[] = [];
    const seenCandidateKeys = new Set<string>();

    for (const u of rawList) {
      // Sentetik veya hayalet kayıtları atla
      if (u.email === 'Tarayıcıda Aktif Profil' || u.email === 'aktif_profil') {
        continue;
      }

      const p = u.profile || {};
      const normName = (u.fullName || p.full_name || '').toLowerCase().trim();
      const normDept = (p.department || '').toLowerCase().trim();
      const kpss = p.kpss_score || 0;
      const candidateKey = `${normName}_${normDept}_${kpss}`;

      if (normName && candidateKey !== '__0' && seenCandidateKeys.has(candidateKey)) {
        // Zaten aynı kişinin kartı var; mükerrer misafir kaydını atla ve yerel depodan da temizle
        if (u.email.includes('@yerel.kamuilan') || u.email.startsWith('misafir_')) {
          try {
            const dbRaw = localStorage.getItem('kamu_ilan_accounts_db');
            if (dbRaw) {
              const db = JSON.parse(dbRaw);
              if (db[u.email]) {
                delete db[u.email];
                localStorage.setItem('kamu_ilan_accounts_db', JSON.stringify(db));
              }
            }
          } catch {}
        }
        continue;
      }

      if (normName && candidateKey !== '__0') {
        seenCandidateKeys.add(candidateKey);
      }

      cleanedList.push(u);
    }

    setRegisteredUsers(cleanedList);
    setLoadingUsers(false);
  };

  // Kullanıcıyı / Kaydı Silme (Yönetici Yetkisi)
  const handleDeleteUser = async (emailToDelete: string) => {
    if (!confirm(`"${emailToDelete}" aday kaydını kalıcı olarak silmek istediğinize emin misiniz?`)) {
      return;
    }

    // 1. Tarayıcı LocalStorage'dan sil
    try {
      const dbRaw = localStorage.getItem('kamu_ilan_accounts_db');
      if (dbRaw) {
        const db = JSON.parse(dbRaw);
        if (db[emailToDelete]) {
          delete db[emailToDelete];
          localStorage.setItem('kamu_ilan_accounts_db', JSON.stringify(db));
        }
      }
    } catch {}

    // 2. Sunucu API'sinden sil
    try {
      await fetch(`/api/admin/users?email=${encodeURIComponent(emailToDelete)}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.warn('Sunucu kullanıcı silme hatası:', e);
    }

    // 3. UI State'ini anında güncelle
    setRegisteredUsers(prev => prev.filter(u => u.email !== emailToDelete));
    if (selectedUserDetail?.email === emailToDelete) {
      setSelectedUserDetail(null);
    }

    setUserActionMsg(`"${emailToDelete}" kaydı başarıyla silindi.`);
    setTimeout(() => setUserActionMsg(''), 4000);
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchUsers();
    }
  }, [isAuthenticated]);

  // Hızlı Senkronizasyon (Scrape API)
  const handleScrapeNow = async () => {
    setScraping(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/admin/scrape', { method: 'POST' });
      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMsg(json.message);
      } else {
        setErrorMsg(json.error || 'Tarama sırasında hata oluştu.');
      }
    } catch (e: any) {
      setErrorMsg('Bağlantı hatası: ' + e.message);
    } finally {
      setScraping(false);
    }
  };

  // Gemini ile İlan Ayrıştırma
  const handleParseWithGemini = async () => {
    if (!rawText.trim() || rawText.length < 20) {
      setErrorMsg('Lütfen geçerli bir ilan metni yapıştırın (en az 20 karakter).');
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    setParsing(true);

    try {
      const res = await fetch('/api/admin/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText, sourceUrl }),
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setParsedData(json.data);
        if (json.warning) {
          setErrorMsg(json.warning);
        }
      } else {
        setErrorMsg(json.error || 'Ayrıştırma başarısız oldu.');
      }
    } catch (e: any) {
      setErrorMsg('Sunucu hatası: ' + e.message);
    } finally {
      setParsing(false);
    }
  };

  // Ayrıştırılan İlanı Veritabanına Kaydet
  const handleSaveToDatabase = async () => {
    if (!parsedData) return;
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/admin/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          announcement: {
            institution: parsedData.institution,
            title: parsedData.title,
            deadline: parsedData.deadline,
            application_method: parsedData.application_method,
            raw_summary: parsedData.raw_summary,
          },
          positions: parsedData.positions,
          sourceUrl: sourceUrl || `https://ilan.gov.tr/manuel/${Date.now()}`,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMsg(
          json.simulated
            ? 'Demo Modu: İlan başarıyla doğrulandı ve önizlendi!'
            : `Başarılı! İlan sisteme eklendi ve kayıtlı adaylara bildirim sırasına alındı.`
        );
      } else {
        setErrorMsg(json.error || 'Veritabanı kaydı sırasında hata oluştu.');
      }
    } catch (e: any) {
      setErrorMsg('Kayıt hatası: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  // İstatistikler
  const totalAnnouncementsCount = announcementsList.length;
  const totalQuotaCount = useMemo(() => {
    return announcementsList.reduce((acc, ann) => {
      const sub = (ann.positions || []).reduce((s, p) => s + (p.quota || 1), 0);
      return acc + sub;
    }, 0);
  }, [announcementsList]);

  // Kullanıcı İstatistikleri
  const registeredCount = useMemo(() => {
    return registeredUsers.filter(u => u.isRegistered).length;
  }, [registeredUsers]);

  const guestCount = useMemo(() => {
    return registeredUsers.filter(u => !u.isRegistered).length;
  }, [registeredUsers]);

  // Kullanıcı Filtreleme
  const filteredUsers = useMemo(() => {
    let list = registeredUsers;

    if (userTypeFilter === 'REGISTERED') {
      list = list.filter(u => u.isRegistered);
    } else if (userTypeFilter === 'GUEST') {
      list = list.filter(u => !u.isRegistered);
    }

    if (!userSearchQuery.trim()) return list;
    const q = userSearchQuery.toLowerCase();
    return list.filter(u => 
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.profile?.department && u.profile.department.toLowerCase().includes(q)) ||
      (u.profile?.city && u.profile.city.toLowerCase().includes(q))
    );
  }, [registeredUsers, userSearchQuery, userTypeFilter]);

  // İlan Filtreleme
  const filteredAnnouncements = useMemo(() => {
    return announcementsList.filter(ann => {
      const matchesSearch = !annSearchQuery.trim() || 
        ann.title.toLowerCase().includes(annSearchQuery.toLowerCase()) ||
        ann.institution.toLowerCase().includes(annSearchQuery.toLowerCase()) ||
        (ann.positions || []).some(p => p.title.toLowerCase().includes(annSearchQuery.toLowerCase()) || p.allowed_departments.some(d => d.toLowerCase().includes(annSearchQuery.toLowerCase())));

      const matchesInst = selectedInstitutionFilter === 'ALL' || ann.institution.toLowerCase().includes(selectedInstitutionFilter.toLowerCase());

      return matchesSearch && matchesInst;
    });
  }, [announcementsList, annSearchQuery, selectedInstitutionFilter]);

  // Giriş Ekranı
  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-[#faf8f5]">
        <div className="max-w-md w-full bg-white p-8 sm:p-10 rounded-3xl border border-[#e5dfd5] shadow-xl shadow-slate-200/50 space-y-6">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-[#7f1d1d] text-white flex items-center justify-center mx-auto shadow-lg shadow-rose-950/20">
              <ShieldCheck className="w-9 h-9 text-rose-200" />
            </div>
            <div className="inline-block px-3 py-1 bg-rose-50 text-rose-800 text-[11px] font-extrabold uppercase tracking-widest rounded-full border border-rose-200">
              YETKİLİ YÖNETİM MERKEZİ
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Kamu İlan Yönetici Girişi
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              Kayıtlı aday profillerini incelemek, yeni ilanları kontrol etmek ve sistem verilerini yönetmek için lütfen yönetici güvenlik şifrenizi giriniz.
            </p>
          </div>

          {pinError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{pinError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Yönetici Güvenlik Şifresi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  placeholder="Yönetici şifreniz..."
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#7f1d1d] focus:border-transparent focus:outline-none font-mono"
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-[#7f1d1d] hover:bg-[#991b1b] text-white text-sm font-bold shadow-lg shadow-rose-950/15 transition-all flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4" />
              <span>Panele Giriş Yap</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="text-center pt-3 border-t border-slate-100">
            <Link href="/" className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors">
              ← Kullanıcı Ana Sayfasına Dön
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Yönetici Paneli Ana Görünümü
  return (
    <div className="bg-[#faf8f5] min-h-screen py-6 sm:py-8 text-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Üst Bar: Hoş Geldiniz & Sistem Durumu */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-[#1f2937] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-12">
            <ShieldCheck className="w-72 h-72 text-white" />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30">
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                  <span>YÖNETİCİ KONTROL PANELİ</span>
                </div>
                {supabaseConfigured !== null && (
                  <div
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                      supabaseConfigured
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    <Database className="w-3 h-3" />
                    <span>
                      {supabaseConfigured
                        ? 'Supabase DB: Bağlı (Kalıcı)'
                        : 'Supabase DB: Bağlı Değil (Geçici Mod — Vercel Env Eksik)'}
                    </span>
                  </div>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Hoş Geldin, Enes Güçlü
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                Kayıtlı adayların girdiği tüm profil verilerini, KPSS puanlarını ve bölümlerini buradan inceleyebilir; 27 aktif resmî kamu ilanını yönetebilir ve yeni ilanları yayına alabilirsin.
              </p>
            </div>

            <div className="flex items-center gap-3 self-start md:self-center">
              <button
                onClick={fetchUsers}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center gap-2 border border-white/10"
                title="Verileri Yenile"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? 'animate-spin' : ''}`} />
                <span>Yenile</span>
              </button>

              <button
                onClick={handleAdminLogout}
                className="px-4 py-2.5 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Çıkış Yap</span>
              </button>
            </div>
          </div>

          {/* İstatistikler */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-700/60 relative z-10">
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <div className="text-slate-400 text-xs font-medium">Aktif Resmî İlan</div>
              <div className="text-2xl font-black text-white mt-1">{totalAnnouncementsCount} İlan</div>
              <div className="text-[11px] text-emerald-400 font-semibold mt-0.5">24 Kariyer Kapısı + 3 Resmî Gazete</div>
            </div>

            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <div className="text-slate-400 text-xs font-medium">Toplam Açık Kontenjan</div>
              <div className="text-2xl font-black text-white mt-1">{totalQuotaCount.toLocaleString('tr-TR')} Kadro</div>
              <div className="text-[11px] text-slate-300 font-semibold mt-0.5">Türkiye Geneli Alım</div>
            </div>

            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <div className="text-slate-400 text-xs font-medium">Kayıtlı Aday Sayısı</div>
              <div className="text-2xl font-black text-rose-300 mt-1">{registeredUsers.length} Kişi</div>
              <div className="text-[11px] text-rose-200/90 font-semibold mt-0.5">
                {registeredCount} Kayıtlı Üye • {guestCount} Misafir
              </div>
            </div>

            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <div className="text-slate-400 text-xs font-medium">Sistem Durumu</div>
              <div className="text-xl font-black text-emerald-400 mt-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Aktif & Canlı</span>
              </div>
              <div className="text-[11px] text-slate-300 font-semibold mt-0.5">08:30 Oto-Tarama (Sabah)</div>
            </div>
          </div>
        </div>

        {/* Sekme Butonları */}
        <div className="flex items-center gap-2 p-1.5 bg-white rounded-2xl border border-[#e5dfd5] shadow-sm overflow-x-auto">
          <button
            onClick={() => setActiveTab('USERS')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'USERS'
                ? 'bg-[#7f1d1d] text-white shadow-md shadow-rose-950/15'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Kayıtlı Kişiler & Adaylar ({registeredUsers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('ANNOUNCEMENTS')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'ANNOUNCEMENTS'
                ? 'bg-[#7f1d1d] text-white shadow-md shadow-rose-950/15'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>İlanları İncele & Yönet ({announcementsList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('NEW_ANNOUNCEMENT')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'NEW_ANNOUNCEMENT'
                ? 'bg-[#7f1d1d] text-white shadow-md shadow-rose-950/15'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Yeni İlan Ekle & AI Ayrıştır</span>
          </button>

          <button
            onClick={() => setActiveTab('SYNC')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'SYNC'
                ? 'bg-[#7f1d1d] text-white shadow-md shadow-rose-950/15'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Veritabanı & Hızlı Senkronize</span>
          </button>
        </div>

        {/* ============================================================== */}
        {/* SEKME 1: KAYITLI KİŞİLER & ADAYLAR                             */}
        {/* ============================================================== */}
        {activeTab === 'USERS' && (
          <div className="space-y-4">
            
            {/* Bildirim Mesajı (Silme vb.) */}
            {userActionMsg && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{userActionMsg}</span>
                </div>
                <button onClick={() => setUserActionMsg('')} className="text-emerald-700 hover:text-emerald-900 text-xs font-bold">
                  ✕
                </button>
              </div>
            )}

            {/* Arama & Üyelik Durumu Filtre Çubuğu */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#e5dfd5] shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="İsim, e-posta veya bölüme göre ara..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#7f1d1d]"
                />
              </div>

              {/* Filtreleme Hapları (Tümü / Kayıtlı Üyeler / Misafirler) */}
              <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
                <button
                  onClick={() => setUserTypeFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    userTypeFilter === 'ALL'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Tüm Adaylar ({registeredUsers.length})
                </button>

                <button
                  onClick={() => setUserTypeFilter('REGISTERED')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    userTypeFilter === 'REGISTERED'
                      ? 'bg-emerald-700 text-white shadow-sm'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                  <span>Kayıtlı Üyeler ({registeredCount})</span>
                </button>

                <button
                  onClick={() => setUserTypeFilter('GUEST')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    userTypeFilter === 'GUEST'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
                  <span>Misafir Adaylar ({guestCount})</span>
                </button>
              </div>

              <div className="text-xs text-slate-500 font-medium whitespace-nowrap">
                Listelenen: <strong className="text-slate-900">{filteredUsers.length}</strong>
              </div>
            </div>

            {/* Kullanıcı Kartları Listesi */}
            {filteredUsers.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-[#e5dfd5] text-center space-y-3">
                <Users className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">Aramaya Uygun Aday Bulunamadı</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {userTypeFilter !== 'ALL' 
                    ? 'Seçtiğiniz filtreye uygun aday bulunmuyor. Filtreyi "Tüm Adaylar" yaparak tekrar deneyebilirsiniz.'
                    : 'Henüz sisteme kayıtlı veya kriter doldurmuş bir aday bulunmuyor.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredUsers.map((user, idx) => {
                  const p = user.profile || {};
                  const isProfileComplete = Boolean(p.department && p.education_level && (p.kpss_score || p.kpss_type));
                  const displayEmail = user.email.includes('@yerel.kamuilan') || user.email.startsWith('misafir_')
                    ? 'Kayıtsız Misafir Ziyaretçi'
                    : user.email;

                  return (
                    <div 
                      key={user.email || idx}
                      className="bg-white rounded-2xl p-5 border border-[#e5dfd5] hover:border-slate-300 transition-all shadow-sm hover:shadow-md space-y-4 flex flex-col justify-between"
                    >
                      {/* Üst Kısım: İsim, E-posta ve Durum Rozeti */}
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                              <span>{user.fullName || p.full_name || 'İsimsiz Aday'}</span>
                              {user.isRegistered ? (
                                <span title="Kayıtlı Üye" className="inline-flex">
                                  <UserCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                </span>
                              ) : (
                                <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">Misafir</span>
                              )}
                            </h3>
                            <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                              <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              <span className={`font-mono truncate max-w-[200px] ${user.isRegistered ? 'text-slate-700 font-semibold' : 'text-slate-400'}`}>
                                {displayEmail}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            {/* Kayıt Durumu Rozeti */}
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border flex items-center gap-1 ${
                              user.isRegistered
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${user.isRegistered ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                              <span>{user.isRegistered ? 'Kayıtlı Üye' : 'Kayıtsız Misafir'}</span>
                            </span>

                            {/* CV Tamamlanma Rozeti */}
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border ${
                              isProfileComplete 
                                ? 'bg-slate-50 text-slate-600 border-slate-200' 
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                              {isProfileComplete ? 'Eksiksiz CV' : 'Kısmi Bilgi'}
                            </span>
                          </div>
                        </div>

                        {/* Kritik CV Bilgileri */}
                        <div className="bg-slate-50 rounded-xl p-3 space-y-2 text-xs border border-slate-100">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-medium">Bölüm:</span>
                            <span className="font-bold text-slate-900 text-right truncate max-w-[180px]">
                              {p.department || 'Bölüm Girilmemiş'}
                              {p.additional_educations && p.additional_educations.length > 0 && (
                                <span className="ml-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  +{p.additional_educations.length} Ek Diploma
                                </span>
                              )}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-medium">Eğitim:</span>
                            <span className="font-bold text-slate-800">
                              {p.education_level || 'Belirtilmemiş'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-medium">KPSS:</span>
                            <span className="font-bold text-emerald-700">
                              {p.kpss_score ? `${p.kpss_score} (${p.kpss_type || 'KPSSP3'})` : 'Puan Girilmemiş'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-medium">İkamet / İl:</span>
                            <span className="font-semibold text-slate-700">
                              {p.city || p.residence_city || 'Belirtilmemiş'}
                            </span>
                          </div>

                          {p.height && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 font-medium">Boy:</span>
                              <span className="font-semibold text-slate-700">{p.height} cm</span>
                            </div>
                          )}

                          {p.yds_score ? (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 font-medium">Yabancı Dil:</span>
                              <span className="font-semibold text-slate-700">
                                {p.language_exam_type || 'YDS'} ({p.foreign_language || 'İngilizce'}): {p.yds_score} Puan ({p.yds_level || 'Belge'})
                              </span>
                            </div>
                          ) : p.yds_level && p.yds_level !== 'YOK' ? (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 font-medium">Yabancı Dil:</span>
                              <span className="font-semibold text-slate-700">{p.yds_level} Düzeyi</span>
                            </div>
                          ) : null}

                          {p.special_statuses && p.special_statuses.length > 0 && (
                            <div className="pt-1 flex flex-wrap gap-1">
                              {p.special_statuses.map(st => (
                                <span key={st} className="px-1.5 py-0.5 rounded bg-purple-50 border border-purple-200 text-purple-700 text-[9px] font-bold">
                                  {st === 'ESKI_HUKUMLU' ? 'Eski Hükümlü' : (st === 'TMY' ? 'TMY Malul' : (st === 'ENGELLI' ? 'Engelli' : (st === 'SEHIT_GAZI_YAKINI' ? 'Şehit/Gazi Yakını' : 'İŞKUR Öncelikli')))}
                                </span>
                              ))}
                            </div>
                          )}

                          {p.has_computer_course && (
                            <div className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold flex items-center gap-1">
                              <span>💻 Transkript Onaylı Bilgisayar Dersi Var</span>
                            </div>
                          )}

                          {p.experience_years !== undefined && p.experience_years > 0 && (
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-500 font-medium">Tecrübe:</span>
                              <span className="font-bold text-slate-800">{p.experience_years} Yıl ({p.experience_field || 'Mesleki'})</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Alt Kısım: Tarih, Favoriler & Aksiyonlar */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <div className="text-[11px] text-slate-400">
                          <span>{user.favorites?.length || 0} Favori</span>
                          {user.updatedAt && (
                            <span className="ml-1.5 text-slate-400">
                              • {new Date(user.updatedAt).toLocaleDateString('tr-TR')}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedUserDetail(user)}
                            className="px-3 py-1.5 rounded-lg bg-[#7f1d1d]/10 hover:bg-[#7f1d1d]/20 text-[#7f1d1d] font-bold text-xs transition-colors flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>İncele</span>
                          </button>

                          <button
                            onClick={() => handleDeleteUser(user.email)}
                            className="p-1.5 rounded-lg hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Adayı / Kaydı Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Seçili Kullanıcı Detay Modalı */}
            {selectedUserDetail && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                        <span>{selectedUserDetail.fullName || 'Aday Detayları'}</span>
                        {selectedUserDetail.isRegistered ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Kayıtlı Üye
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                            Misafir Aday
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-500 font-mono mt-1">
                        {selectedUserDetail.email.includes('@yerel.kamuilan') || selectedUserDetail.email.startsWith('misafir_')
                          ? 'Kayıtsız Ziyaretçi (Şifreli hesabı henüz açılmamış)'
                          : selectedUserDetail.email}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedUserDetail(null)}
                      className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-slate-400 block font-medium">Üyelik / Hesap Durumu</span>
                        <strong className={selectedUserDetail.isRegistered ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                          {selectedUserDetail.isRegistered ? 'Şifreli Kayıtlı Hesap' : 'Misafir / Kayıtsız Profil'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Son İşlem / Güncelleme</span>
                        <strong className="text-slate-800">
                          {selectedUserDetail.updatedAt ? new Date(selectedUserDetail.updatedAt).toLocaleString('tr-TR') : 'Bilinmiyor'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Eğitim Düzeyi</span>
                        <strong className="text-slate-800">{selectedUserDetail.profile?.education_level || 'Belirtilmemiş'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Bölüm</span>
                        <strong className="text-slate-800">{selectedUserDetail.profile?.department || 'Girilmemiş'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">KPSS Puanı & Türü</span>
                        <strong className="text-emerald-700">
                          {selectedUserDetail.profile?.kpss_score 
                            ? `${selectedUserDetail.profile.kpss_score} (${selectedUserDetail.profile.kpss_type || 'KPSSP3'})` 
                            : 'Girilmemiş'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">İkamet Şehri</span>
                        <strong className="text-slate-800">{selectedUserDetail.profile?.city || selectedUserDetail.profile?.residence_city || 'Belirtilmemiş'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Doğum Tarihi</span>
                        <strong className="text-slate-800">{selectedUserDetail.profile?.birth_date || 'Belirtilmemiş'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Boy</span>
                        <strong className="text-slate-800">
                          {selectedUserDetail.profile?.height ? `${selectedUserDetail.profile.height} cm` : 'Girilmemiş'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Yabancı Dil</span>
                        <strong className="text-slate-800">
                          {selectedUserDetail.profile?.yds_score 
                            ? `${selectedUserDetail.profile?.language_exam_type || 'YDS'} (${selectedUserDetail.profile?.foreign_language || 'İngilizce'} - ${selectedUserDetail.profile?.language_exam_year || ''}): ${selectedUserDetail.profile.yds_score} Puan (${selectedUserDetail.profile.yds_level || 'Belge'})` 
                            : (selectedUserDetail.profile?.yds_level && selectedUserDetail.profile.yds_level !== 'YOK' ? `${selectedUserDetail.profile.yds_level} Düzeyi` : 'Girilmemiş')}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Askerlik Durumu</span>
                        <strong className="text-slate-800">{selectedUserDetail.profile?.military_status || 'Belirtilmemiş'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Bilgisayar Dersi (Transkript)</span>
                        <strong className={selectedUserDetail.profile?.has_computer_course ? 'text-emerald-700' : 'text-slate-600'}>
                          {selectedUserDetail.profile?.has_computer_course ? '✓ Okulda Dersi Aldı (Kamuda Geçerli)' : 'Hayır / Belirtilmedi'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Mesleki Tecrübe</span>
                        <strong className="text-slate-800">
                          {selectedUserDetail.profile?.experience_years 
                            ? `${selectedUserDetail.profile.experience_years} Yıl (${selectedUserDetail.profile.experience_field || 'Mesleki'}) ${selectedUserDetail.profile.has_sgk_service ? '• SGK Onaylı' : ''}` 
                            : 'Deneyim Yok'}
                        </strong>
                      </div>
                    </div>

                    {/* Çift / Ek Diplomalar */}
                    {selectedUserDetail.profile?.additional_educations && selectedUserDetail.profile.additional_educations.length > 0 && (
                      <div className="pt-2 border-t border-slate-200">
                        <span className="text-slate-400 block font-medium mb-1">Kayıtlı Ek Diplomalar (Çift Anadal / Önlisans & Lisans):</span>
                        <div className="space-y-1.5">
                          {selectedUserDetail.profile.additional_educations.map((edu, eIdx) => (
                            <div key={eIdx} className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold flex items-center justify-between shadow-xs">
                              <span className="text-slate-800">🎓 {eIdx + 2}. Diploma: <strong>{edu.department}</strong></span>
                              <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-mono border border-emerald-200 font-bold">
                                {edu.education_level} ({edu.graduation_status})
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedUserDetail.profile?.special_statuses && selectedUserDetail.profile.special_statuses.length > 0 && (
                      <div className="pt-2 border-t border-slate-200">
                        <span className="text-slate-400 block font-medium mb-1">Özel Statü Durumu:</span>
                        <div className="flex flex-wrap gap-1">
                          {selectedUserDetail.profile.special_statuses.map(st => (
                            <span key={st} className="px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200 text-purple-800 font-bold text-[10px]">
                              {st === 'ESKI_HUKUMLU' ? 'Eski Hükümlü' : (st === 'TMY' ? 'Terörle Mücadelede Malul (TMY)' : (st === 'ENGELLI' ? 'Engelli Kontenjanı' : (st === 'SEHIT_GAZI_YAKINI' ? 'Şehit / Gazi Yakını' : 'İŞKUR Öncelik Hakkı')))}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedUserDetail.profile?.preferred_cities && selectedUserDetail.profile.preferred_cities.length > 0 && (
                      <div className="pt-2 border-t border-slate-200">
                        <span className="text-slate-400 block font-medium mb-1">Çalışmak İstediği İller:</span>
                        <div className="flex flex-wrap gap-1">
                          {selectedUserDetail.profile.preferred_cities.map(c => (
                            <span key={c} className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-semibold text-[10px]">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedUserDetail.profile?.certificates && selectedUserDetail.profile.certificates.length > 0 && (
                      <div className="pt-2 border-t border-slate-200">
                        <span className="text-slate-400 block font-medium mb-1">Sahip Olduğu Ehliyet & Sertifikalar:</span>
                        <div className="flex flex-wrap gap-1">
                          {selectedUserDetail.profile.certificates.map(cert => (
                            <span key={cert} className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-[10px]">
                              {cert}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => handleDeleteUser(selectedUserDetail.email)}
                      className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Bu Kaydı Sistemden Sil</span>
                    </button>

                    <button
                      onClick={() => setSelectedUserDetail(null)}
                      className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all"
                    >
                      Kapat
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* SEKME 2: İLANLARI İNCELE & YÖNET (27 AKTİF İLAN)               */}
        {/* ============================================================== */}
        {activeTab === 'ANNOUNCEMENTS' && (
          <div className="space-y-4">
            
            {/* Arama & Kurum Filtresi */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#e5dfd5] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-96">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="İlan başlığı, kurum veya bölüm ara..."
                  value={annSearchQuery}
                  onChange={(e) => setAnnSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#7f1d1d]"
                />
              </div>

              <div className="text-xs text-slate-500 font-medium">
                Toplam <strong className="text-slate-900">{filteredAnnouncements.length}</strong> ilan listeleniyor
              </div>
            </div>

            {/* İlan Kartları Listesi */}
            <div className="space-y-3">
              {filteredAnnouncements.map((ann) => {
                const totalQuota = (ann.positions || []).reduce((s, p) => s + (p.quota || 1), 0);
                const dDate = new Date(ann.deadline);
                const now = new Date();
                const diffDays = Math.ceil((dDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                const daysLeft = diffDays < 0 ? 0 : diffDays;

                return (
                  <div 
                    key={ann.id}
                    className="bg-white rounded-2xl p-5 border border-[#e5dfd5] hover:border-slate-300 transition-all shadow-sm space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200">
                            {ann.institution}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                            {ann.source === 'KARIYER_KAPISI' ? 'Kariyer Kapısı' : 'Resmî Gazete'}
                          </span>
                          <span className="text-xs text-slate-400">
                            ID: <code className="font-mono">{ann.id}</code>
                          </span>
                        </div>
                        <h3 className="text-base font-extrabold text-slate-900 pt-1">
                          {ann.title}
                        </h3>
                        <p className="text-xs text-slate-500 line-clamp-2">
                          {ann.raw_summary}
                        </p>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 flex-shrink-0">
                        <div className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-black">
                          {totalQuota} Kontenjan
                        </div>
                        <div className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">
                          {daysLeft > 0 ? `${daysLeft} gün kaldı` : 'Son gün'}
                        </div>
                      </div>
                    </div>

                    {/* Kadrolar Özeti */}
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        İlanın Kadro ve Şartları ({ann.positions?.length || 0} Pozisyon):
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {(ann.positions || []).map((pos, pIdx) => (
                          <div key={pos.id || pIdx} className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs space-y-1">
                            <div className="font-bold text-slate-900 truncate" title={pos.title}>
                              {pos.title}
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-500">
                              <span>Kontenjan: <strong>{pos.quota}</strong></span>
                              <span className="text-emerald-700 font-bold">{pos.kpss_type} ≥ {pos.min_kpss_score}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              Şehirler: {pos.cities?.join(', ') || 'Türkiye Geneli'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Aksiyon Linkleri */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <span className="text-slate-400 text-[11px]">
                        Son Başvuru: <strong>{new Date(ann.deadline).toLocaleDateString('tr-TR')}</strong>
                      </span>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/ilan/${ann.id}`}
                          target="_blank"
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Kullanıcı Görünümü</span>
                        </Link>

                        <a
                          href={ann.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-[#7f1d1d]/10 hover:bg-[#7f1d1d]/20 text-[#7f1d1d] font-bold transition-colors flex items-center gap-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Resmî Kurum Sayfası</span>
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SEKME 3: YENİ İLAN EKLE & AI AYRIŞTIR                          */}
        {/* ============================================================== */}
        {activeTab === 'NEW_ANNOUNCEMENT' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#e5dfd5] shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-black text-slate-900">
                Resmî Gazete Metnini Gemini ile Akıllı Ayrıştır
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Resmî Gazete veya kurum duyuru metnini aşağıya yapıştırın. Yapay zekâ tüm kadroları, KPSS şartlarını ve tarihleri anında yapılandırılmış veriye dönüştürür.
              </p>
            </div>

            {errorMsg && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Resmî Kaynak URL'si (Opsiyonel)
                </label>
                <input
                  type="url"
                  placeholder="https://www.resmigazete.gov.tr/ilanlar/..."
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:ring-1 focus:ring-[#7f1d1d] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  İlanın Ham Metni / PDF Dökümü
                </label>
                <textarea
                  rows={8}
                  placeholder="Resmî Gazete'den veya kurum internet sitesinden kopyaladığınız personel alım ilan metnini buraya yapıştırın..."
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  className="w-full p-3.5 text-xs rounded-xl border border-slate-200 focus:ring-1 focus:ring-[#7f1d1d] focus:outline-none font-mono leading-relaxed"
                />
              </div>

              <button
                onClick={handleParseWithGemini}
                disabled={parsing}
                className="w-full py-3.5 rounded-xl bg-[#7f1d1d] hover:bg-[#991b1b] text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-rose-200" />
                <span>{parsing ? 'Gemini İlanı Analiz Ediyor...' : 'Metni Otomatik Ayrıştır'}</span>
              </button>
            </div>

            {/* Ayrıştırılan Önizleme */}
            {parsedData && (
              <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900">
                    Ayrıştırılan İlan Verisi (Önizleme)
                  </h3>
                  <button
                    onClick={handleSaveToDatabase}
                    disabled={saving}
                    className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{saving ? 'Kaydediliyor...' : 'Doğrula ve Yayına Al'}</span>
                  </button>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium">Kurum:</span>
                    <strong className="text-slate-900 ml-2">{parsedData.institution}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Başlık:</span>
                    <strong className="text-slate-900 ml-2">{parsedData.title}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Son Başvuru:</span>
                    <strong className="text-slate-900 ml-2">{parsedData.deadline}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Özet:</span>
                    <p className="text-slate-700 mt-1">{parsedData.raw_summary}</p>
                  </div>

                  <div>
                    <span className="text-slate-400 font-medium block mb-1">
                      Kadro Listesi ({parsedData.positions?.length || 0} Pozisyon):
                    </span>
                    <div className="space-y-2">
                      {(parsedData.positions || []).map((pos: any, idx: number) => (
                        <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                          <div className="flex items-center justify-between font-bold text-slate-900">
                            <span>{pos.title}</span>
                            <span className="text-emerald-700">{pos.quota} Kişi</span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            KPSS: {pos.kpss_type} ≥ {pos.min_kpss_score} • Eğitim: {pos.education_level}
                          </div>
                          {pos.allowed_departments && (
                            <div className="text-[10px] text-slate-400">
                              Bölümler: {pos.allowed_departments.join(', ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* SEKME 4: VERİTABANI & HIZLI SENKRONİZE                         */}
        {/* ============================================================== */}
        {activeTab === 'SYNC' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#e5dfd5] shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                İlan Havuzu & Veritabanı Senkronizasyonu
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Sistemdeki tüm doğrulanmış 27 kamu ilanını Supabase veritabanı ile eşitleyebilir veya otomatik tarama durumunu kontrol edebilirsiniz.
              </p>
            </div>

            {errorMsg && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-600" />
                  <span>Veritabanı Senkronizasyonu</span>
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Tüm 27 doğrulanmış kamu ilanını (Kariyer Kapısı + Resmî Gazete) mükerrer kontrolü yaparak veritabanına aktarır.
                </p>
                <button
                  onClick={handleScrapeNow}
                  disabled={scraping}
                  className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${scraping ? 'animate-spin' : ''}`} />
                  <span>{scraping ? 'Senkronize Ediliyor...' : 'Şimdi Senkronize Et'}</span>
                </button>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-rose-700" />
                  <span>GitHub Actions Otomasyonu</span>
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Her gün 08:30 ve 18:30'da çalışan otomatik Resmî Gazete scraper workflow'unu GitHub panelinden canlı tetikleyebilir veya durumunu izleyebilirsiniz.
                </p>
                <a
                  href="https://github.com/enesguclu06/KamuIlan/actions"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3 rounded-xl bg-[#7f1d1d] hover:bg-[#991b1b] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 text-center"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>GitHub Actions Paneline Git</span>
                </a>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
