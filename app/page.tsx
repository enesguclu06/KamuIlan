'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Building2, 
  GraduationCap, 
  MapPin, 
  ChevronRight, 
  Clock, 
  Users, 
  Check, 
  HelpCircle,
  XCircle,
  FileText,
  SlidersHorizontal,
  ArrowRight,
  ShieldCheck,
  Award,
  ExternalLink,
  Heart,
  EyeOff,
  Sparkles,
  ChevronDown,
  Info,
  Lock,
  AlertTriangle,
  UserCheck
} from 'lucide-react';
import { Announcement, Position, MatchStatus } from '@/types';
import { SAMPLE_ANNOUNCEMENTS } from '@/lib/sample-data';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { useUserProfile } from '@/lib/context/user-profile-context';
import { computeAnnouncementMatch } from '@/lib/matcher';

const ALL_TURKEY_CITIES = [
  'ADANA', 'ADIYAMAN', 'AFYONKARAHİSAR', 'AĞRI', 'AMASYA', 'ANKARA', 'ANTALYA', 'ARTVİN',
  'AYDIN', 'BALIKESİR', 'BİLECİK', 'BİNGÖL', 'BİTLİS', 'BOLU', 'BURDUR', 'BURSA', 'ÇANAKKALE',
  'ÇANKIRI', 'ÇORUM', 'DENİZLİ', 'DİYARBAKIR', 'EDİRNE', 'ELAZIĞ', 'ERZİNCAN', 'ERZURUM',
  'ESKİŞEHİR', 'GAZİANTEP', 'GİRESUN', 'GÜMÜŞHANE', 'HAKKARİ', 'HATAY', 'ISPARTA', 'MERSİN',
  'İSTANBUL', 'İZMİR', 'KARS', 'KASTAMONU', 'KAYSERİ', 'KIRKLARELİ', 'KIRŞEHİR', 'KOCAELİ',
  'KONYA', 'KÜTAHYA', 'MALATYA', 'MANİSA', 'KAHRAMANMARAŞ', 'MARDİN', 'MUĞLA', 'MUŞ',
  'NEVŞEHİR', 'NİĞDE', 'ORDU', 'RİZE', 'SAKARYA', 'SAMSUN', 'SİİRT', 'SİNOP', 'SİVAS',
  'TEKİRDAĞ', 'TOKAT', 'TRABZON', 'TUNCELİ', 'ŞANLIURFA', 'UŞAK', 'VAN', 'YOZGAT', 'ZONGULDAK',
  'AKSARAY', 'BAYBURT', 'KARAMAN', 'KIRIKKALE', 'BATMAN', 'ŞIRNAK', 'BARTIN', 'ARDAHAN',
  'IĞDIR', 'YALOVA', 'KARABÜK', 'KİLİS', 'OSMANİYE', 'DÜZCE'
];

export default function HomePage() {
  const router = useRouter();
  const { profile, hasProfileFilled, isLoggedIn, favorites, toggleFavorite } = useUserProfile();
  const [announcements, setAnnouncements] = useState<Announcement[]>(SAMPLE_ANNOUNCEMENTS);
  const [loading, setLoading] = useState(false);

  // Filtreler
  const [searchQuery, setSearchQuery] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedWorkTypes, setSelectedWorkTypes] = useState<string[]>([]);
  const [selectedExamType, setSelectedExamType] = useState<string>('');
  const [selectedEduLevel, setSelectedEduLevel] = useState<string>('');
  const [filterSuitable, setFilterSuitable] = useState(false);
  const [filterMaybe, setFilterMaybe] = useState(false);
  const [onlyUpcoming, setOnlyUpcoming] = useState(false);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [sortOption, setSortOption] = useState<'DEADLINE' | 'NEWEST' | 'QUOTA'>('DEADLINE');
  const [activeStatTab, setActiveStatTab] = useState<'ANNOUNCEMENTS' | 'POSITIONS' | 'INSTITUTIONS'>('ANNOUNCEMENTS');

  // Supabase'den canlı ilanları çekme ve örnek verilerle güvenli birleştirme
  useEffect(() => {
    async function fetchAnnouncements() {
      if (!isSupabaseConfigured || !supabase) return;

      try {
        setLoading(true);
        const { data: annData, error: annError } = await (supabase as any)
          .from('announcements')
          .select(`
            *,
            positions (*)
          `)
          .order('deadline', { ascending: true });

        if (annData && annData.length > 0 && !annError) {
          // Supabase'den gelen verileri normalize et ve boş olanları ele
          const normalizedDb = annData
            .map((a: any) => ({
              ...a,
              positions: (a.positions || []).map((p: any) => ({
                ...p,
                is_any_department: p.is_any_department ?? false,
                allowed_departments: p.allowed_departments ?? [],
                special_conditions: p.special_conditions ?? [],
                cities: p.cities ?? [],
              })),
            }))
            .filter((a: any) => (a.positions || []).length > 0);

          // SAMPLE_ANNOUNCEMENTS'i daima temel al, veritabanındaki yeni ilanları üstüne ekle (süresi geçmiş veya sahte olanları alma)
          const sampleUrls = new Set(SAMPLE_ANNOUNCEMENTS.map(s => s.source_url));
          const sampleTitles = new Set(SAMPLE_ANNOUNCEMENTS.map(s => s.title));
          const nowMs = Date.now();
          const extraFromDb = normalizedDb.filter((a: any) => 
            !sampleUrls.has(a.source_url) && 
            !sampleTitles.has(a.title) &&
            a.is_active === true &&
            !a.title.includes('450 Sözleşmeli') &&
            !a.title.includes('60 Sözleşmeli') &&
            (a.source_url?.includes('.gov.tr') || a.source_url?.includes('.edu.tr') || a.source_url?.includes('resmigazete.gov.tr')) &&
            new Date(a.deadline).getTime() >= (nowMs - 24 * 60 * 60 * 1000)
          );

          setAnnouncements([...SAMPLE_ANNOUNCEMENTS, ...extraFromDb]);
        }
      } catch (e) {
        console.warn('Canlı ilan verisi çekilirken hata oluştu, doğrulanmış ilanlar gösteriliyor:', e);
      } finally {
        setLoading(false);
      }
    }

    fetchAnnouncements();
  }, []);

  // Eşleştirme ve Gün Hesabı
  const evaluatedAnnouncements = useMemo(() => {
    return announcements.map((ann) => {
      const matchSummary = computeAnnouncementMatch(profile, ann.positions || []);
      const deadlineDate = new Date(ann.deadline);
      const now = new Date();
      const diffTime = deadlineDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const startDate = ann.application_start_date ? new Date(ann.application_start_date) : null;
      const isUpcoming = Boolean(startDate && startDate.getTime() > now.getTime());
      const daysToStart = isUpcoming && startDate
        ? Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        ...ann,
        matchSummary,
        daysLeft: diffDays,
        startDate,
        isUpcoming,
        daysToStart,
      };
    });
  }, [announcements, profile]);

  // Filtreleme Mantığı
  const filteredList = useMemo(() => {
    let list = evaluatedAnnouncements.filter((item) => {
      // 0. Favoriler Filtresi
      if (onlyFavorites && !favorites.includes(item.id)) {
        return false;
      }

      // 0.1 Gelecek Tarihli İlanlar Filtresi
      if (onlyUpcoming && !item.isUpcoming) {
        return false;
      }

      // 1. Uygunluk Filtresi (Bağımsız Çoklu Seçim: Tam Uygun / Belki Uygun / İkisi Birlikte)
      if (hasProfileFilled) {
        if (filterSuitable && filterMaybe) {
          // İkisi de seçiliyse: ya Tam Uygun ya da Belki Uygun olanlar listelenir
          if (item.matchSummary.suitableCount === 0 && item.matchSummary.maybeCount === 0) {
            return false;
          }
        } else if (filterSuitable) {
          // Yalnızca Tam Uygun olanlar
          if (item.matchSummary.suitableCount === 0) {
            return false;
          }
        } else if (filterMaybe) {
          // Yalnızca Belki Uygun olanlar
          if (item.matchSummary.maybeCount === 0) {
            return false;
          }
        }
      }

      // 2. Metin Arama (Kurum, Başlık, Kadro, Şehir, Başvuru Yöntemi, Özet)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesInstitution = item.institution.toLowerCase().includes(q);
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesPosition = (item.positions || []).some(p => p.title.toLowerCase().includes(q));
        const matchesCities = (item.positions || []).some(p => p.cities.some(c => c.toLowerCase().includes(q)));
        const matchesMethod = (item.application_method || '').toLowerCase().includes(q);
        const matchesSummary = (item.raw_summary || '').toLowerCase().includes(q);
        const matchesUpcomingKeyword = (q.includes('gelecek') || q.includes('yakında') || q.includes('aralık') || q.includes('7 aralık')) && (item.isUpcoming || matchesMethod);

        if (!matchesInstitution && !matchesTitle && !matchesPosition && !matchesCities && !matchesMethod && !matchesSummary && !matchesUpcomingKeyword) return false;
      }

      // 3. Şehir Filtresi (Çoklu seçim)
      if (selectedCities.length > 0) {
        const matchesAnyCity = (item.positions || []).some(p =>
          p.cities.some(c => selectedCities.includes(c) || c === 'TÜRKİYE GENELİ')
        );
        if (!matchesAnyCity) return false;
      }

      // 4. Eğitim Düzeyi
      if (selectedEduLevel) {
        const matchesEdu = (item.positions || []).some(p => p.education_level === selectedEduLevel);
        if (!matchesEdu) return false;
      }

      // 5. Sınav Türü
      if (selectedExamType) {
        const matchesExam = (item.positions || []).some(p => p.exam_type === selectedExamType);
        if (!matchesExam) return false;
      }

      // 6. Çalışma Şekli Filtresi
      if (selectedWorkTypes.length > 0) {
        const text = `${item.title} ${item.raw_summary || ''} ${(item.positions || []).map(p => p.title).join(' ')}`.toLowerCase();
        const matchesWorkType = selectedWorkTypes.some((wt) => {
          if (wt === 'BANKA') return item.institution_type === 'BANKA' || item.source === 'BANKA' || text.includes('banka') || text.includes('ziraat') || text.includes('vakifbank');
          if (wt === 'SOZLESMELI') return text.includes('sözleşmeli') || text.includes('4/b') || text.includes('4-b');
          if (wt === 'ISCI') return text.includes('işçi') || text.includes('4/d') || text.includes('şoför') || text.includes('temizlik') || text.includes('güvenlik');
          if (wt === 'AKADEMIK') return text.includes('öğretim') || text.includes('akademik') || text.includes('araştırma görevlisi') || text.includes('doçent') || text.includes('profesör');
          if (wt === 'MEMUR') return !text.includes('işçi') && !text.includes('öğretim görevlisi') && !text.includes('banka');
          return true;
        });
        if (!matchesWorkType) return false;
      }

      return true;
    });

    // Sıralama
    if (sortOption === 'DEADLINE') {
      list.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
    } else if (sortOption === 'NEWEST') {
      list.sort((a, b) => new Date(b.publish_date).getTime() - new Date(a.publish_date).getTime());
    } else if (sortOption === 'QUOTA') {
      list.sort((a, b) => {
        const qA = (a.positions || []).reduce((s, p) => s + p.quota, 0);
        const qB = (b.positions || []).reduce((s, p) => s + p.quota, 0);
        return qB - qA;
      });
    }

    return list;
  }, [evaluatedAnnouncements, onlyFavorites, favorites, onlyUpcoming, filterSuitable, filterMaybe, hasProfileFilled, searchQuery, selectedCities, selectedWorkTypes, selectedEduLevel, selectedExamType, sortOption]);

  const totalPositionsCount = useMemo(() => {
    return announcements.reduce((sum, a) => sum + (a.positions || []).reduce((s, p) => s + p.quota, 0), 0);
  }, [announcements]);

  const totalInstitutionsCount = useMemo(() => {
    const instSet = new Set(announcements.map(a => a.institution));
    return instSet.size;
  }, [announcements]);

  const expiringThisWeekCount = useMemo(() => {
    return evaluatedAnnouncements.filter(a => a.daysLeft > 0 && a.daysLeft <= 7 && !a.isUpcoming).length;
  }, [evaluatedAnnouncements]);

  const newAnnouncementsCount = useMemo(() => {
    return evaluatedAnnouncements.filter(a => {
      const pDate = new Date(a.publish_date);
      const diff = Date.now() - pDate.getTime();
      return diff <= 7 * 24 * 60 * 60 * 1000;
    }).length;
  }, [evaluatedAnnouncements]);

  const upcomingAnnouncementsCount = useMemo(() => {
    return evaluatedAnnouncements.filter(a => a.isUpcoming).length;
  }, [evaluatedAnnouncements]);

  const suitableAnnouncementsCount = useMemo(() => {
    if (!hasProfileFilled) return 0;
    return evaluatedAnnouncements.filter(a => a.matchSummary.suitableCount > 0).length;
  }, [evaluatedAnnouncements, hasProfileFilled]);

  const maybeAnnouncementsCount = useMemo(() => {
    if (!hasProfileFilled) return 0;
    return evaluatedAnnouncements.filter(a => a.matchSummary.maybeCount > 0).length;
  }, [evaluatedAnnouncements, hasProfileFilled]);

  // Yalnızca sistemde gerçekten var olan aktif favori ilanların sayısı
  const validFavoritesCount = useMemo(() => {
    const validIds = new Set(announcements.map(a => a.id));
    return Array.from(new Set(favorites)).filter(id => validIds.has(id)).length;
  }, [announcements, favorites]);

  // Gerçek ilanlara göre anlık dinamik şehir sayıları
  const dynamicCityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    announcements.forEach((ann) => {
      const citySet = new Set<string>();
      (ann.positions || []).forEach((pos) => {
        (pos.cities || []).forEach((c) => {
          if (c && c.trim()) citySet.add(c.trim().toUpperCase());
        });
      });
      if (citySet.size === 0) {
        citySet.add('TÜRKİYE GENELİ');
      }
      citySet.forEach((c) => {
        counts[c] = (counts[c] || 0) + 1;
      });
    });
    return counts;
  }, [announcements]);

  // Dinamik çalışma şekli sayıları
  const workTypeCounts = useMemo(() => {
    let memur = 0;
    let sozlesmeli = 0;
    let isci = 0;
    let akademik = 0;
    let banka = 0;

    announcements.forEach((ann) => {
      const text = `${ann.title} ${ann.raw_summary || ''} ${(ann.positions || []).map(p => p.title).join(' ')}`.toLowerCase();
      if (ann.institution_type === 'BANKA' || ann.source === 'BANKA' || text.includes('banka') || text.includes('ziraat') || text.includes('vakifbank')) {
        banka++;
      } else if (text.includes('sözleşmeli') || text.includes('4/b') || text.includes('4-b')) {
        sozlesmeli++;
      } else if (text.includes('işçi') || text.includes('4/d') || text.includes('şoför') || text.includes('temizlik') || text.includes('güvenlik')) {
        isci++;
      } else if (text.includes('öğretim') || text.includes('akademik') || text.includes('araştırma görevlisi') || text.includes('doçent') || text.includes('profesör')) {
        akademik++;
      } else {
        memur++;
      }
    });

    return {
      'MEMUR': memur,
      'SOZLESMELI': sozlesmeli,
      'ISCI': isci,
      'AKADEMIK': akademik,
      'BANKA': banka,
    };
  }, [announcements]);

  // Şehir listesi ve arama: Aktif ilanı olanlar en başta, sayıya göre sıralı
  const filteredCityList = useMemo(() => {
    const activeCities = Object.keys(dynamicCityCounts).sort((a, b) => {
      if (a === 'TÜRKİYE GENELİ') return -1;
      if (b === 'TÜRKİYE GENELİ') return 1;
      return (dynamicCityCounts[b] || 0) - (dynamicCityCounts[a] || 0);
    });

    if (!citySearch.trim()) {
      return activeCities;
    }

    const q = citySearch.toLowerCase();
    const searchCombined = Array.from(new Set([...activeCities, ...ALL_TURKEY_CITIES]));
    return searchCombined.filter(c => c.toLowerCase().includes(q));
  }, [dynamicCityCounts, citySearch]);

  const activeFiltersCount = useMemo(() => {
    return (filterSuitable ? 1 : 0) +
      (filterMaybe ? 1 : 0) +
      (onlyUpcoming ? 1 : 0) +
      (onlyFavorites ? 1 : 0) +
      selectedCities.length +
      selectedWorkTypes.length +
      (selectedEduLevel ? 1 : 0) +
      (selectedExamType ? 1 : 0);
  }, [filterSuitable, filterMaybe, onlyUpcoming, onlyFavorites, selectedCities, selectedWorkTypes, selectedEduLevel, selectedExamType]);

  const handleCityToggle = (city: string) => {
    if (selectedCities.includes(city)) {
      setSelectedCities(selectedCities.filter(c => c !== city));
    } else {
      setSelectedCities([...selectedCities, city]);
    }
  };

  return (
    <div className="bg-[#faf8f5] min-h-screen text-slate-800 pb-16">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        
        {/* BAŞLIK VE AÇIKLAMA */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Kamu personel ilanları
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Resmî kaynaklardan toplanan açık ilanlar; kurum, il, bölüm ve puana göre filtrele.
          </p>
        </div>

        {/* 3 BÜYÜK İSTATİSTİK KARTI (DİNAMİK VE GERÇEK DEĞERLER) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Kart 1: Açık İlan */}
          <button
            type="button"
            onClick={() => setActiveStatTab('ANNOUNCEMENTS')}
            className={`p-5 rounded-2xl text-left transition-all flex items-center justify-between ${
              activeStatTab === 'ANNOUNCEMENTS'
                ? 'bg-[#1b4332] text-white shadow-md'
                : 'bg-white border border-[#e5dfd5] text-slate-900 hover:bg-slate-50'
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl sm:text-3xl font-black font-mono">{announcements.length}</span>
                <span className="font-bold text-sm sm:text-base">açık ilan</span>
              </div>
              <p className={`text-xs mt-0.5 ${activeStatTab === 'ANNOUNCEMENTS' ? 'text-emerald-200' : 'text-slate-500'}`}>
                İlan bazında güncel liste
              </p>
            </div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activeStatTab === 'ANNOUNCEMENTS' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
              <Check className="w-4 h-4" />
            </div>
          </button>

          {/* Kart 2: Açık Kadro */}
          <button
            type="button"
            onClick={() => setActiveStatTab('POSITIONS')}
            className={`p-5 rounded-2xl text-left transition-all flex items-center justify-between ${
              activeStatTab === 'POSITIONS'
                ? 'bg-[#1b4332] text-white shadow-md'
                : 'bg-white border border-[#e5dfd5] text-slate-900 hover:bg-slate-50'
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl sm:text-3xl font-black font-mono">{totalPositionsCount.toLocaleString('tr-TR')}</span>
                <span className="font-bold text-sm sm:text-base">kadro</span>
              </div>
              <p className={`text-xs mt-0.5 ${activeStatTab === 'POSITIONS' ? 'text-emerald-200' : 'text-slate-500'}`}>
                Toplam kontenjan sayısı
              </p>
            </div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activeStatTab === 'POSITIONS' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>

          {/* Kart 3: Kurum */}
          <button
            type="button"
            onClick={() => setActiveStatTab('INSTITUTIONS')}
            className={`p-5 rounded-2xl text-left transition-all flex items-center justify-between ${
              activeStatTab === 'INSTITUTIONS'
                ? 'bg-[#1b4332] text-white shadow-md'
                : 'bg-white border border-[#e5dfd5] text-slate-900 hover:bg-slate-50'
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl sm:text-3xl font-black font-mono">{totalInstitutionsCount}</span>
                <span className="font-bold text-sm sm:text-base">kurum</span>
              </div>
              <p className={`text-xs mt-0.5 ${activeStatTab === 'INSTITUTIONS' ? 'text-emerald-200' : 'text-slate-500'}`}>
                İlan açan resmî kurumlar
              </p>
            </div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activeStatTab === 'INSTITUTIONS' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>

        {/* HIZLI İSTATİSTİK ŞERİDİ & YEŞİL BİLGİ BANTLARI */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-[#e5dfd5] text-xs font-semibold text-slate-700">
            <span className="text-slate-400">AÇIK:</span>
            <span className="font-bold text-slate-900 font-mono">{announcements.length}</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-[#e5dfd5] text-xs font-semibold text-slate-700">
            <span className="text-slate-400">BU HAFTA BİTİYOR:</span>
            <span className="font-bold text-amber-700 font-mono">{expiringThisWeekCount}</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-[#e5dfd5] text-xs font-semibold text-slate-700">
            <span className="text-slate-400">YENİ İLANLAR:</span>
            <span className="font-bold text-emerald-700 font-mono">{newAnnouncementsCount}</span>
          </div>

          {/* Favorilerim Quick Pill */}
          <button
            type="button"
            onClick={() => {
              const next = !onlyFavorites;
              setOnlyFavorites(next);
              if (next) {
                setFilterSuitable(false);
                setFilterMaybe(false);
                setOnlyUpcoming(false);
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              onlyFavorites
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-white border border-[#e5dfd5] text-slate-700 hover:bg-rose-50'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-white text-white' : 'text-rose-500 fill-rose-500'}`} />
            <span className={onlyFavorites ? 'text-rose-100 font-bold' : 'text-slate-400 font-bold'}>FAVORİLERİM:</span>
            <span className={`font-bold font-mono ${onlyFavorites ? 'text-white' : 'text-rose-600'}`}>{validFavoritesCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setOnlyUpcoming(!onlyUpcoming)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              onlyUpcoming
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white border border-[#e5dfd5] text-slate-700 hover:bg-blue-50'
            }`}
          >
            <Calendar className={`w-3.5 h-3.5 ${onlyUpcoming ? 'text-white' : 'text-blue-600'}`} />
            <span className={onlyUpcoming ? 'text-blue-100 font-bold' : 'text-slate-400 font-bold'}>BAŞVURUSU YAKINDA:</span>
            <span className={`font-bold font-mono ${onlyUpcoming ? 'text-white' : 'text-blue-700'}`}>{upcomingAnnouncementsCount}</span>
          </button>

          {hasProfileFilled && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setFilterSuitable(!filterSuitable)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  filterSuitable
                    ? 'bg-[#1b4332] text-white shadow-sm ring-2 ring-emerald-400'
                    : 'bg-emerald-50 border border-emerald-200 text-[#1b4332] hover:bg-emerald-100'
                }`}
              >
                <CheckCircle2 className={`w-3.5 h-3.5 ${filterSuitable ? 'text-emerald-300' : 'text-emerald-600'}`} />
                <span className="font-bold">SANA TAM UYGUN:</span>
                <span className="font-bold font-mono">{suitableAnnouncementsCount} İlan</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterMaybe(!filterMaybe)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  filterMaybe
                    ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-400'
                    : 'bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100'
                }`}
              >
                <HelpCircle className={`w-3.5 h-3.5 ${filterMaybe ? 'text-amber-200' : 'text-amber-600'}`} />
                <span className="font-bold">BELKİ UYGUN (ÖZEL ŞARTLI):</span>
                <span className="font-bold font-mono">{maybeAnnouncementsCount} İlan</span>
              </button>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-[#1b4332]">
            <span className="px-1.5 py-0.5 rounded bg-[#1b4332] text-white text-[10px]">Tercih kılavuzu</span>
            <span>Resmî Gazete ve Kariyer Kapısı alımları</span>
          </div>
        </div>

        {/* MOBİL FİLTRE AÇ/KAPAT ÇUBUĞU */}
        <div className="lg:hidden mb-4">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-2xl border border-[#e5dfd5] shadow-sm font-bold text-xs text-slate-800 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#1b4332]" />
              <span className="font-extrabold">Filtreleme Seçenekleri (İl, Pozisyon, Sınav)</span>
              {activeFiltersCount > 0 && (
                <span className="bg-[#1b4332] text-white text-[10px] px-2 py-0.5 rounded-full font-mono">
                  {activeFiltersCount} Aktif
                </span>
              )}
            </div>
            <span className="text-xs text-[#1b4332] font-bold">
              {mobileFiltersOpen ? 'Filtreleri Gizle ▲' : 'Filtreleri Aç ▼'}
            </span>
          </button>
        </div>

        {/* ============================================================================== */}
        {/* İKİ KOLONLU ANA ALAN (SOL: FİLTRELER | SAĞ: İLAN AKIŞI) */}
        {/* ============================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* SOL FİLTRELEME PANELİ (3 KOLON) */}
          <aside className={`lg:col-span-3 bg-white p-5 rounded-2xl border border-[#e5dfd5] shadow-sm space-y-6 lg:sticky lg:top-20 z-10 ${
            mobileFiltersOpen ? 'block' : 'hidden lg:block'
          }`}>
            
            {/* 1. UYGUNLUK DURUMU (3 SEÇENEKLİ FİLTRE) */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">UYGUNLUK DURUMU</span>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setFilterSuitable(false);
                    setFilterMaybe(false);
                    setOnlyFavorites(false);
                    setOnlyUpcoming(false);
                  }}
                  className={`w-full p-2.5 rounded-xl flex items-center justify-between text-xs font-bold transition-all ${
                    !filterSuitable && !filterMaybe && !onlyFavorites && !onlyUpcoming
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                  }`}
                >
                  <span>Tüm Açık İlanlar</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    !filterSuitable && !filterMaybe && !onlyFavorites && !onlyUpcoming ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {announcements.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!hasProfileFilled) {
                      router.push('/profil');
                      return;
                    }
                    setOnlyFavorites(false);
                    setFilterSuitable(!filterSuitable);
                  }}
                  className={`w-full p-2.5 rounded-xl flex items-center justify-between text-xs font-bold transition-all ${
                    filterSuitable
                      ? 'bg-[#1b4332] text-white shadow-md ring-2 ring-emerald-400/60'
                      : 'bg-emerald-50 hover:bg-emerald-100/80 text-[#1b4332] border border-emerald-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className={`w-3.5 h-3.5 ${filterSuitable ? 'text-emerald-300' : 'text-emerald-600'}`} />
                    <span>Tam Bana Uygun</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    filterSuitable ? 'bg-white/20 text-white' : 'bg-white text-[#1b4332]'
                  }`}>
                    {hasProfileFilled ? `${suitableAnnouncementsCount} İlan` : 'Kriter Belirle'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!hasProfileFilled) {
                      router.push('/profil');
                      return;
                    }
                    setOnlyFavorites(false);
                    setFilterMaybe(!filterMaybe);
                  }}
                  className={`w-full p-2.5 rounded-xl flex items-center justify-between text-xs font-bold transition-all ${
                    filterMaybe
                      ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-400/60'
                      : 'bg-amber-50 hover:bg-amber-100/80 text-amber-900 border border-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <HelpCircle className={`w-3.5 h-3.5 ${filterMaybe ? 'text-amber-200' : 'text-amber-600'}`} />
                    <span>Belki Uygun (Özel Şartlı)</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    filterMaybe ? 'bg-white/20 text-white' : 'bg-white text-amber-900'
                  }`}>
                    {hasProfileFilled ? `${maybeAnnouncementsCount} İlan` : 'Kriter Belirle'}
                  </span>
                </button>

                {/* Gelecek İlanlar Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    setOnlyFavorites(false);
                    setOnlyUpcoming(!onlyUpcoming);
                  }}
                  className={`w-full p-2.5 rounded-xl flex items-center justify-between text-xs font-bold transition-all ${
                    onlyUpcoming
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-blue-50/70 hover:bg-blue-100/70 text-blue-900 border border-blue-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Calendar className={`w-3.5 h-3.5 ${onlyUpcoming ? 'text-white' : 'text-blue-600'}`} />
                    <span>Gelecek İlanlar (Yakında)</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    onlyUpcoming ? 'bg-white/20 text-white' : 'bg-white text-blue-900'
                  }`}>
                    {upcomingAnnouncementsCount} İlan
                  </span>
                </button>

                {/* Favoriler Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    const next = !onlyFavorites;
                    setOnlyFavorites(next);
                    if (next) {
                      setFilterSuitable(false);
                      setFilterMaybe(false);
                      setOnlyUpcoming(false);
                    }
                  }}
                  className={`w-full p-2.5 rounded-xl flex items-center justify-between text-xs font-bold transition-all ${
                    onlyFavorites
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'bg-rose-50/70 hover:bg-rose-100/70 text-rose-900 border border-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Heart className={`w-3.5 h-3.5 ${onlyFavorites ? 'text-white fill-white' : 'text-rose-600 fill-rose-600'}`} />
                    <span>Favori İlanlarım</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    onlyFavorites ? 'bg-white/20 text-white' : 'bg-white text-rose-900'
                  }`}>
                    {validFavoritesCount} İlan
                  </span>
                </button>
              </div>
            </div>

            {/* 2. İL FİLTRESİ (ARAMALI VE CHECKBOX'LI) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">İL SEÇİMİ</span>
                {selectedCities.length > 0 && (
                  <button
                    onClick={() => setSelectedCities([])}
                    className="text-[11px] text-rose-600 font-semibold hover:underline"
                  >
                    Temizle ({selectedCities.length})
                  </button>
                )}
              </div>

              {/* İl Arama Input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="İl ara..."
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
                />
              </div>

              {/* Şehir Listesi (Scrollable) */}
              <div className="max-h-44 overflow-y-auto space-y-1 pr-1 text-xs">
                {filteredCityList.map((city) => {
                  const isChecked = selectedCities.includes(city);
                  const count = dynamicCityCounts[city] || 0;
                  return (
                    <label
                      key={city}
                      onClick={() => handleCityToggle(city)}
                      className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition-colors ${
                        isChecked ? 'bg-emerald-50 text-[#1b4332] font-bold' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          readOnly
                          className="rounded text-[#1b4332] focus:ring-0 w-3.5 h-3.5"
                        />
                        <span className="capitalize">{city.toLowerCase()}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">{count}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 3. ÇALIŞMA ŞEKLİ */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">ÇALIŞMA ŞEKLİ</span>
                {selectedWorkTypes.length > 0 && (
                  <button
                    onClick={() => setSelectedWorkTypes([])}
                    className="text-[11px] text-rose-600 font-semibold hover:underline"
                  >
                    Temizle ({selectedWorkTypes.length})
                  </button>
                )}
              </div>
              <div className="space-y-1 text-xs">
                {[
                  { key: 'SOZLESMELI', label: 'Sözleşmeli Personel (4/B)', count: workTypeCounts.SOZLESMELI },
                  { key: 'ISCI', label: 'Sürekli İşçi (4/D)', count: workTypeCounts.ISCI },
                  { key: 'MEMUR', label: 'Memur (657 4/A)', count: workTypeCounts.MEMUR },
                  { key: 'BANKA', label: 'Kamu Bankaları & Finans', count: workTypeCounts.BANKA },
                  { key: 'AKADEMIK', label: 'Akademik Personel', count: workTypeCounts.AKADEMIK },
                ].map((item) => {
                  const isChecked = selectedWorkTypes.includes(item.key);
                  return (
                    <label
                      key={item.key}
                      onClick={() => {
                        if (isChecked) {
                          setSelectedWorkTypes(selectedWorkTypes.filter((w) => w !== item.key));
                        } else {
                          setSelectedWorkTypes([...selectedWorkTypes, item.key]);
                        }
                      }}
                      className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition-colors ${
                        isChecked ? 'bg-emerald-50 text-[#1b4332] font-bold' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          readOnly
                          className="rounded text-[#1b4332] focus:ring-0 w-3.5 h-3.5"
                        />
                        <span>{item.label}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">{item.count}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 4. MÜLAKAT / SINAV DURUMU */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">SINAV TÜRÜ</span>
              <div className="space-y-1 text-xs">
                {[
                  { key: '', label: 'Tümü' },
                  { key: 'KPSS_PUAN_USTUNLUGU', label: 'Mülakatsız (Doğrudan KPSS)' },
                  { key: 'MULAKAT', label: 'Mülakat / Sözlü Sınav' },
                  { key: 'UYGULAMALI', label: 'Uygulamalı Sınav (Klavye/Parkur)' },
                  { key: 'KURUM_SINAVI', label: 'Yazılı Kurum Sınavı' },
                ].map((item) => (
                  <label
                    key={item.key}
                    onClick={() => setSelectedExamType(item.key)}
                    className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer ${
                      selectedExamType === item.key ? 'bg-emerald-50 text-[#1b4332] font-bold' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="exam_type"
                      checked={selectedExamType === item.key}
                      readOnly
                      className="text-[#1b4332] focus:ring-0 w-3.5 h-3.5"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 5. EĞİTİM DÜZEYİ */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">EĞİTİM DÜZEYİ</span>
              <select
                value={selectedEduLevel}
                onChange={(e) => setSelectedEduLevel(e.target.value)}
                className="w-full p-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#1b4332] bg-white font-medium"
              >
                <option value="">Tüm Eğitim Seviyeleri</option>
                <option value="LISANS">Lisans (4 Yıllık)</option>
                <option value="ONLISANS">Önlisans (2 Yıllık)</option>
                <option value="LISE">Ortaöğretim / Lise</option>
                <option value="YUKSEK_LISANS">Yüksek Lisans</option>
              </select>
            </div>

            {/* Filtreleri Sıfırla */}
            <button
              type="button"
              onClick={() => {
                setSelectedCities([]);
                setSelectedWorkTypes([]);
                setSelectedEduLevel('');
                setSelectedExamType('');
                setFilterSuitable(false);
                setFilterMaybe(false);
                setOnlyFavorites(false);
                setOnlyUpcoming(false);
                setSearchQuery('');
              }}
              className="w-full py-2 text-xs font-bold text-slate-500 hover:text-rose-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Filtreleri Temizle
            </button>
          </aside>

          {/* SAĞ ANA İLAN LİSTESİ PANELİ (9 KOLON) */}
          <main className="lg:col-span-9 space-y-4">
            
            {/* ÜST ARAMA VE SIRALAMA ÇUBUĞU */}
            <div className="bg-white p-3 rounded-2xl border border-[#e5dfd5] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Kadro, kurum veya il ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
                />
              </div>

              <div className="flex items-center justify-between w-full sm:w-auto gap-3 text-xs">
                <span className="font-bold text-slate-600">
                  <strong>{filteredList.length}</strong> ilan listeleniyor
                </span>

                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as any)}
                  className="py-1.5 px-3 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="DEADLINE">Sırala: Son Başvuruya Göre</option>
                  <option value="NEWEST">Sırala: En Yeni İlanlar</option>
                  <option value="QUOTA">Sırala: Kontenjan Sayısı</option>
                </select>
              </div>
            </div>

            {/* Henüz Kriter Girmemiş Adaylar İçin Bilgilendirme Bannerı */}
            {!hasProfileFilled && (
              <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1b4332] text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Sparkles className="w-5 h-5 text-emerald-300" />
                  </div>
                  <div>
                    <p className="font-bold text-[#1b4332] text-sm">Size Özel İlanları Otomatik Filtreleyin</p>
                    <p className="text-slate-600 text-xs mt-0.5">
                      Mezuniyet ve KPSS bilgilerinizi tanımlayarak binlerce kamu kadrosu arasından şartlarını sağladıklarınızı tek tıkla listeleyin.
                    </p>
                  </div>
                </div>
                <Link
                  href="/profil"
                  className="px-4 py-2.5 rounded-xl bg-[#1b4332] hover:bg-[#2d6a4f] text-white font-bold transition-all shadow-sm flex items-center gap-1.5 whitespace-nowrap"
                >
                  <UserCheck className="w-4 h-4 text-emerald-300" />
                  <span>Kriterlerimi Belirle</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            {/* İLAN KARTLARI (MEMURYOLU BİREBİR KART YAPISI) */}
            {filteredList.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-[#e5dfd5] p-8 space-y-3">
                <FileText className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">Seçilen Filtrelere Uygun İlan Bulunamadı</h3>
                <p className="text-xs text-slate-500">Soldaki filtreleri temizleyerek veya arama kelimesini değiştirerek tekrar deneyebilirsiniz.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredList.map((announcement) => {
                  const { matchSummary, daysLeft } = announcement;
                  const positions = announcement.positions || [];
                  const totalQuota = positions.reduce((sum, p) => sum + (p.quota || 1), 0);
                  const isFav = favorites.includes(announcement.id);

                  // Tarih Parçaları
                  const dDate = new Date(announcement.deadline);
                  const monthName = dDate.toLocaleString('tr-TR', { month: 'short' }).toUpperCase();
                  const dayNum = dDate.getDate();
                  const hours = dDate.getHours().toString().padStart(2, '0');
                  const minutes = dDate.getMinutes().toString().padStart(2, '0');

                  // İlan Şart ve Kadro Özetleri
                  const firstPos = positions[0];
                  const positionsText = positions.map(p => p.title).join(', ');
                  const departmentsText = firstPos?.is_any_department
                    ? 'Tüm Lisans/Önlisans Programları'
                    : (firstPos?.allowed_departments?.slice(0, 3).join(', ') || 'Belirtilen Bölümler');

                  // Uygunluk Rozeti
                  let matchButton = null;
                  if (hasProfileFilled) {
                    if (matchSummary.suitableCount > 0) {
                      matchButton = (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-[#1b4332] text-xs font-bold border border-emerald-300">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Tam Sana Uygun ({matchSummary.suitableCount} Kadro)</span>
                        </span>
                      );
                    } else if (matchSummary.maybeCount > 0) {
                      matchButton = (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300">
                          <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Belki Uygun (Özel Şartlı)</span>
                        </span>
                      );
                    } else {
                      matchButton = (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-500 text-xs font-medium border border-slate-200">
                          <XCircle className="w-3.5 h-3.5 text-slate-400" />
                          <span>Şartlar Uymuyor</span>
                        </span>
                      );
                    }
                  } else {
                    matchButton = (
                      <Link
                        href="/profil"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors"
                      >
                        <Lock className="w-3 h-3 text-slate-400" />
                        <span>Sana uygun mu?</span>
                      </Link>
                    );
                  }

                  return (
                    <div
                      key={announcement.id}
                      className="bg-white rounded-2xl border border-[#e5dfd5] p-5 sm:p-6 shadow-sm hover:shadow-md transition-all space-y-4"
                    >
                      {/* ÜST BİLGİ VE SAĞ TARİH KUTUSU (MEMURYOLU FORMATI) */}
                      <div className="flex items-start justify-between gap-4">
                        
                        {/* Sol Taraf: Logo, Kurum Başlığı ve Etiketler */}
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-[#f2eee9] border border-[#e5dfd5] text-[#1b4332] font-black text-sm flex items-center justify-center flex-shrink-0">
                              {announcement.institution.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <Link
                                href={`/ilan/${announcement.id}`}
                                className="text-base sm:text-lg font-black text-slate-900 hover:text-[#1b4332] transition-colors leading-snug line-clamp-1"
                              >
                                {announcement.institution}
                              </Link>
                              <p className="text-xs font-semibold text-slate-500 line-clamp-1">
                                {announcement.title}
                              </p>
                            </div>
                          </div>

                          {/* Rozetler Şeridi */}
                          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                            <span className="px-2.5 py-0.5 rounded-lg bg-sky-50 text-sky-800 font-semibold border border-sky-100">
                              {firstPos?.title?.split('/')[0]?.trim() || 'Personel Alımı'}
                            </span>

                            <span className="flex items-center gap-1 text-slate-600 font-medium">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              {firstPos?.cities?.slice(0, 2).join(', ') || 'Türkiye Geneli'}
                            </span>

                            <span className="flex items-center gap-1 text-slate-600 font-medium">
                              <Users className="w-3.5 h-3.5 text-slate-400" />
                              {totalQuota} kişi
                            </span>

                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium text-[11px]">
                              {firstPos?.exam_type === 'KPSS_PUAN_USTUNLUGU' ? 'Mülakatsız' : firstPos?.exam_type === 'KURUM_SINAVI' ? 'Yazılı Sınav' : firstPos?.exam_type === 'UYGULAMALI' ? 'Uygulamalı' : 'Mülakat var'}
                            </span>

                            <span className="text-slate-400 text-[11px]">
                              {announcement.source === 'RESMI_GAZETE' ? 'Resmî Gazete' : 'Kariyer Kapısı'}
                            </span>

                            {announcement.isUpcoming && (
                              <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 flex items-center gap-1 text-[11px]">
                                <Calendar className="w-3 h-3 text-indigo-600" />
                                <span>Gelecek İlan: {announcement.startDate ? `${announcement.startDate.getDate()} ${announcement.startDate.toLocaleString('tr-TR', { month: 'short' }).toUpperCase()}` : ''} Başlıyor ({announcement.daysToStart} gün var)</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Sağ Taraf: Büyük Takvim Kutusu */}
                        {announcement.isUpcoming ? (
                          <div className="w-24 rounded-xl overflow-hidden border border-indigo-200 text-center shadow-sm flex-shrink-0 bg-white">
                            <div className="bg-indigo-600 text-white text-[10px] font-black py-0.5 tracking-wider uppercase">
                              BAŞLANGIÇ
                            </div>
                            <div className="py-1 bg-indigo-50/40">
                              <span className="text-2xl font-black text-indigo-950 leading-none">
                                {announcement.startDate ? announcement.startDate.getDate() : dayNum}
                              </span>
                              <span className="block text-[10px] text-indigo-700 font-bold mt-0.5 uppercase">
                                {announcement.startDate ? announcement.startDate.toLocaleString('tr-TR', { month: 'short' }) : monthName}
                              </span>
                            </div>
                            <div className="bg-indigo-50 py-1 px-1 border-t border-indigo-100">
                              <span className="text-[10px] font-extrabold text-indigo-700 block">
                                {announcement.daysToStart} gün kaldı
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="w-20 rounded-xl overflow-hidden border border-[#e5dfd5] text-center shadow-sm flex-shrink-0 bg-white">
                            <div className="bg-[#b91c1c] text-white text-[10px] font-black py-0.5 tracking-wider uppercase">
                              {monthName}
                            </div>
                            <div className="py-1">
                              <span className="text-2xl font-black text-slate-900 leading-none">
                                {dayNum}
                              </span>
                              <span className="block text-[10px] text-slate-500 font-mono mt-0.5">
                                {hours}:{minutes}
                              </span>
                            </div>
                            <div className="bg-slate-50 py-1 px-1 border-t border-slate-100">
                              {daysLeft <= 0 ? (
                                <span className="text-[10px] font-bold text-slate-400">Bitti</span>
                              ) : daysLeft <= 2 ? (
                                <span className="text-[10px] font-extrabold text-[#b91c1c] block">
                                  Son {daysLeft} gün
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold text-slate-600">
                                  {daysLeft} gün kaldı
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                      </div>

                      {/* GÖVDE: KADROLAR VE KOŞULLAR BÖLÜMÜ (MEMURYOLU FORMATI) */}
                      <div className="p-3.5 rounded-xl bg-[#faf8f5] border border-[#f0ece5] text-xs space-y-2">
                        <div className="flex items-start gap-2">
                          <span className="font-extrabold text-slate-400 uppercase w-20 flex-shrink-0">
                            KADROLAR:
                          </span>
                          <span className="font-bold text-slate-800 line-clamp-1">
                            {positionsText}
                          </span>
                        </div>

                        <div className="flex items-start gap-2">
                          <span className="font-extrabold text-slate-400 uppercase w-20 flex-shrink-0">
                            KOŞULLAR:
                          </span>
                          <span className="text-slate-600 line-clamp-1">
                            {departmentsText} • {firstPos?.education_level} {firstPos?.kpss_type !== 'KPSS_YOK' ? `• KPSS: ${firstPos?.min_kpss_score}` : ''}
                          </span>
                        </div>

                        <div className="flex items-start gap-2">
                          <span className="font-extrabold text-slate-400 uppercase w-20 flex-shrink-0">
                            BAŞVURU:
                          </span>
                          <span className="text-slate-600 truncate">
                            {announcement.application_method}
                          </span>
                        </div>

                        {/* GELECEK BAŞVURU BİLGİ KUTUSU */}
                        {announcement.isUpcoming && (
                          <div className="p-2.5 rounded-xl bg-indigo-50/90 border border-indigo-200 text-indigo-950 text-xs flex items-center gap-2 mt-2">
                            <Info className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                            <span className="font-medium text-[11px]">
                              <strong>Gelecek Başvuru:</strong> Bu ilanın Resmî Gazete ilanı yayımlanmış olup başvurular henüz açılmamıştır. Başvurular <strong>{announcement.startDate ? announcement.startDate.toLocaleDateString('tr-TR') : ''}</strong> tarihinde başlayacaktır ({announcement.daysToStart} gün sonra).
                            </span>
                          </div>
                        )}

                        {/* ÖZEL ŞART / BELGE UYARISI */}
                        {hasProfileFilled && matchSummary.suitableCount === 0 && matchSummary.maybeCount > 0 && (
                          <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-200/90 text-xs space-y-1.5 mt-2">
                            <div className="flex items-center gap-1.5 font-bold text-amber-900">
                              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                              <span>Aranan Özel Şart / Belge / Durum:</span>
                            </div>
                            <ul className="list-disc list-inside space-y-0.5 text-amber-950 font-medium text-[11px] pl-1">
                              {matchSummary.matchedPositions
                                .filter(mp => mp.evaluation.status === 'BELKI')
                                .flatMap(mp => {
                                  const specConds = mp.position.special_conditions || [];
                                  const specReasons = (mp.evaluation.reasons || []).filter(r => 
                                    r.includes('şart') || r.includes('belge') || r.includes('YDS') || r.includes('ALES') || r.includes('tecrübe') || r.includes('öğrenci')
                                  );
                                  return [...specConds, ...specReasons];
                                })
                                .filter((item, idx, arr) => arr.indexOf(item) === idx)
                                .slice(0, 3)
                                .map((condText, cIdx) => (
                                  <li key={cIdx}>{condText}</li>
                                ))}
                            </ul>
                          </div>
                        )}

                        {/* TAM UYGUNLUK BİLGİ KUTUSU */}
                        {hasProfileFilled && matchSummary.suitableCount > 0 && (
                          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-[#1b4332] flex items-center gap-2 mt-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            <span className="font-semibold text-[11px]">
                              Bölümünüz, eğitim seviyeniz ve KPSS puanınız bu ilandaki <strong>{matchSummary.suitableCount} kadronun</strong> şartlarını eksiksiz karşılamaktadır!
                            </span>
                          </div>
                        )}
                      </div>

                      {/* ALT AKSİYON ŞERİDİ */}
                      <div className="pt-1 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          {/* Başvur Butonu veya Gelecek Tarihli Bilgi Butonu */}
                          {announcement.isUpcoming ? (
                            <button
                              type="button"
                              onClick={() => alert(`Bu ilan için başvurular ${announcement.startDate ? announcement.startDate.toLocaleDateString('tr-TR') : ''} tarihinde başlayacaktır.\n\nİlan Tarihleri: ${announcement.application_method}\n\nBaşvuru günü geldiğinde sistem üzerinden doğrudan başvuru ekranına yönlendirileceksiniz.`)}
                              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-xs font-bold transition-all shadow-sm"
                              title="Başvuru süreci henüz başlamadı"
                            >
                              <Clock className="w-3.5 h-3.5 text-indigo-600" />
                              <span>{announcement.startDate ? `${announcement.startDate.getDate()} ${announcement.startDate.toLocaleString('tr-TR', { month: 'short' })}'te Açılacak` : 'Yakında Açılacak'}</span>
                            </button>
                          ) : (
                            <a
                              href={
                                announcement.application_method.includes('http')
                                  ? announcement.application_method
                                      .match(/https?:\/\/[^\s)]+/)?.[0]
                                      ?.replace('isealimkariyerkapisi.cbiko.gov.tr', 'kariyerkapisi.gov.tr/Ilanlar/UyeIlanlar')
                                      ?.replace('www.turkiye.gov.tr/kariyer-kapisi-kamu-ise-alim', 'kariyerkapisi.gov.tr/Ilanlar/UyeIlanlar')
                                      || 'https://kariyerkapisi.gov.tr/Ilanlar/UyeIlanlar'
                                  : 'https://kariyerkapisi.gov.tr/Ilanlar/UyeIlanlar'
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#1b4332] hover:bg-[#2d6a4f] text-white text-xs font-bold transition-all shadow-sm"
                            >
                              <span>Başvur</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}

                          {/* Sana Uygun mu? Butonu */}
                          {matchButton}

                          {/* Favori Butonu */}
                          <button
                            type="button"
                            onClick={() => toggleFavorite(announcement.id)}
                            className={`p-2 rounded-xl border text-xs font-semibold transition-colors flex items-center gap-1 ${
                              isFav
                                ? 'bg-rose-50 text-rose-600 border-rose-200'
                                : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                            }`}
                            title="Favorilere Ekle"
                          >
                            <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-600 text-rose-600' : ''}`} />
                            <span className="hidden sm:inline">Favori</span>
                          </button>
                        </div>

                        {/* Detay ve Şart Karşılaştırma Bağlantısı */}
                        <Link
                          href={`/ilan/${announcement.id}`}
                          className="text-xs font-bold text-slate-700 hover:text-[#1b4332] flex items-center gap-1 hover:underline"
                        >
                          <span>Şartları & Kadroları İncele</span>
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </main>

        </div>

      </div>
    </div>
  );
}
