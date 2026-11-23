'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Search, 
  Filter, 
  Sparkles, 
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
  ArrowRight
} from 'lucide-react';
import { Announcement, Position, MatchStatus } from '@/types';
import { SAMPLE_ANNOUNCEMENTS } from '@/lib/sample-data';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { useUserProfile } from '@/lib/context/user-profile-context';
import { computeAnnouncementMatch } from '@/lib/matcher';

export default function HomePage() {
  const { profile, hasProfileFilled } = useUserProfile();
  const [announcements, setAnnouncements] = useState<Announcement[]>(SAMPLE_ANNOUNCEMENTS);
  const [loading, setLoading] = useState(false);

  // Filtre durumları
  const [activeTab, setActiveTab] = useState<'ALL' | 'SUITABLE' | 'MAYBE' | 'EXPIRING'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedEduLevel, setSelectedEduLevel] = useState('');

  // Supabase'den canlı ilanları çekme
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
          setAnnouncements(annData as Announcement[]);
        }
      } catch (e) {
        console.warn('Canlı ilan verisi çekilirken hata oluştu, örnek veri gösteriliyor:', e);
      } finally {
        setLoading(false);
      }
    }

    fetchAnnouncements();
  }, []);

  // İlanları kullanıcı profiliyle değerlendir
  const evaluatedAnnouncements = useMemo(() => {
    return announcements.map((ann) => {
      const matchSummary = computeAnnouncementMatch(profile, ann.positions || []);
      
      const deadlineDate = new Date(ann.deadline);
      const now = new Date();
      const diffTime = deadlineDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        ...ann,
        matchSummary,
        daysLeft: diffDays,
      };
    });
  }, [announcements, profile]);

  // Sekme ve Arama Filtrelemesi
  const filteredList = useMemo(() => {
    return evaluatedAnnouncements.filter((item) => {
      // 1. Sekme Filtresi
      if (activeTab === 'SUITABLE' && item.matchSummary.suitableCount === 0) return false;
      if (activeTab === 'MAYBE' && (item.matchSummary.maybeCount === 0 || item.matchSummary.suitableCount > 0)) return false;
      if (activeTab === 'EXPIRING' && (item.daysLeft > 7 || item.daysLeft < 0)) return false;

      // 2. Metin Arama Filtresi (Kurum, Başlık veya Kadro Ünvanı)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesInstitution = item.institution.toLowerCase().includes(q);
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesPosition = (item.positions || []).some(p => p.title.toLowerCase().includes(q));
        if (!matchesInstitution && !matchesTitle && !matchesPosition) return false;
      }

      // 3. Şehir Filtresi
      if (selectedCity) {
        const matchesCity = (item.positions || []).some(p => 
          p.cities.includes(selectedCity) || p.cities.includes('TÜRKİYE GENELİ')
        );
        if (!matchesCity) return false;
      }

      // 4. Eğitim Seviyesi Filtresi
      if (selectedEduLevel) {
        const matchesEdu = (item.positions || []).some(p => p.education_level === selectedEduLevel);
        if (!matchesEdu) return false;
      }

      return true;
    });
  }, [evaluatedAnnouncements, activeTab, searchQuery, selectedCity, selectedEduLevel]);

  // Toplam uygun kadro sayısı
  const totalSuitablePositions = useMemo(() => {
    return evaluatedAnnouncements.reduce((acc, item) => acc + item.matchSummary.suitableCount, 0);
  }, [evaluatedAnnouncements]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* 1. ÜST HERO / HOŞGELDİNİZ BANNERI */}
      {hasProfileFilled && profile ? (
        // Kullanıcı Profilini Doldurmuşsa: Kişiselleştirilmiş Özet
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-slate-800">
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            <div className="lg:col-span-2 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-400/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Kriterlerinize Göre Canlı Eşleştirme Aktif</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                {profile.department || profile.education_level} İçin Açılan Kamu İlanları
              </h1>
              <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
                KPSS {profile.kpss_score ? `(${profile.kpss_score})` : ''} {profile.ales_score ? `| ALES: ${profile.ales_score}` : ''} {profile.yds_score ? `| Dil: ${profile.yds_score}` : ''} puanlarınıza ve yaşınıza göre şartlarını tam karşıladığınız kadrolar aşağıda yeşil rozetle işaretlenmiştir.
              </p>
            </div>

            {/* Profil Durum Kartı */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Kayıtlı Kriterleriniz</span>
                <Link href="/profil" className="text-sky-300 hover:text-white underline font-medium">
                  Değiştir
                </Link>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-white truncate">
                  {profile.department || 'Bölüm Tanımlı'}
                </p>
                <div className="flex flex-wrap gap-1.5 text-xs text-slate-300">
                  <span className="px-2 py-0.5 rounded bg-white/10 font-semibold">{profile.education_level}</span>
                  {profile.kpss_score ? (
                    <span className="px-2 py-0.5 rounded bg-white/10 font-mono font-bold">
                      {profile.kpss_type}: {profile.kpss_score}
                    </span>
                  ) : null}
                  {profile.ales_score ? (
                    <span className="px-2 py-0.5 rounded bg-amber-500/30 font-mono font-bold text-amber-200">
                      ALES: {profile.ales_score}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-slate-300">Tam Uyumlu Kadro:</span>
                <span className="text-xl font-black text-emerald-400 font-mono">
                  {totalSuitablePositions} Adet
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Yeni Ziyaretçi: Kriter Girişi Çağrısı
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sky-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-sky-800">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-8 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-200 text-xs font-semibold border border-sky-400/30">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Akıllı Kamu Personel Alım Platformu</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Size Hangi Kamu İlanlarının Uyduğunu Öğrenin
              </h1>
              <p className="text-slate-200 text-sm max-w-2xl leading-relaxed">
                Bölümünüzü, KPSS/ALES puanınızı ve mezuniyet durumunuzu 1 dakikada girin. Yüzlerce sayfalık Resmî Gazete metinlerini okumak yerine yalnızca <strong>başvurabileceğiniz kadroları</strong> görün!
              </p>
            </div>

            <div className="md:col-span-4 flex flex-col justify-center">
              <Link
                href="/profil"
                className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-white text-slate-900 hover:bg-sky-50 text-sm font-extrabold shadow-lg transition-all hover:scale-105"
              >
                <SlidersHorizontal className="w-4 h-4 text-sky-600" />
                <span>Kriterlerini Gir ve Başla</span>
                <ArrowRight className="w-4 h-4 text-slate-500" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 2. HIZLI FİLTRE SEKMELERİ */}
      <div className="flex flex-wrap gap-2 sm:gap-3 items-center border-b border-slate-200 pb-4">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'ALL'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>Tüm İlanlar</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-slate-200 text-slate-800 font-bold">
            {evaluatedAnnouncements.length}
          </span>
        </button>

        {hasProfileFilled && (
          <>
            <button
              onClick={() => setActiveTab('SUITABLE')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'SUITABLE'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Bana Uygunlar (Yeşil)</span>
              <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-800 font-bold">
                {evaluatedAnnouncements.filter(a => a.matchSummary.suitableCount > 0).length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('MAYBE')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'MAYBE'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                  : 'bg-white text-amber-700 hover:bg-amber-50 border border-amber-200'
              }`}
            >
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span>Belki Uygunlar (Sarı)</span>
              <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800 font-bold">
                {evaluatedAnnouncements.filter(a => a.matchSummary.maybeCount > 0 && a.matchSummary.suitableCount === 0).length}
              </span>
            </button>
          </>
        )}

        <button
          onClick={() => setActiveTab('EXPIRING')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'EXPIRING'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
              : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200'
          }`}
        >
          <Clock className="w-4 h-4 text-rose-500" />
          <span>Son Başvurusu Yaklaşanlar</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-rose-100 text-rose-800 font-bold">
            {evaluatedAnnouncements.filter(a => a.daysLeft <= 7 && a.daysLeft >= 0).length}
          </span>
        </button>
      </div>

      {/* 3. ARAMA VE FİLTRE ÇUBUĞU */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="sm:col-span-6 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
          <input
            type="text"
            placeholder="Kurum adı (Bakanlık, Üniversite), unvan (Mühendis, Avukat, Büro Personeli)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
          />
        </div>

        <div className="sm:col-span-3">
          <select
            value={selectedEduLevel}
            onChange={(e) => setSelectedEduLevel(e.target.value)}
            className="w-full py-2 px-3 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white"
          >
            <option value="">Tüm Eğitim Seviyeleri</option>
            <option value="LISANS">Lisans (4 Yıllık)</option>
            <option value="ONLISANS">Önlisans (2 Yıllık)</option>
            <option value="LISE">Ortaöğretim / Lise</option>
            <option value="YUKSEK_LISANS">Yüksek Lisans</option>
          </select>
        </div>

        <div className="sm:col-span-3">
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="w-full py-2 px-3 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white"
          >
            <option value="">Tüm İller</option>
            <option value="ANKARA">Ankara</option>
            <option value="İSTANBUL">İstanbul</option>
            <option value="İZMİR">İzmir</option>
            <option value="BURSA">Bursa</option>
            <option value="ANTALYA">Antalya</option>
            <option value="TÜRKİYE GENELİ">Türkiye Geneli</option>
          </select>
        </div>
      </div>

      {/* 4. İLAN LİSTESİ */}
      {filteredList.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 space-y-4">
          <FileText className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-lg font-bold text-slate-700">Seçilen Kriterlere Uygun İlan Bulunamadı</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Arama filtrenizi temizleyebilir veya profilinizdeki kriterleri güncelleyerek daha fazla ilanı görüntüleyebilirsiniz.
          </p>
          <button
            onClick={() => {
              setActiveTab('ALL');
              setSearchQuery('');
              setSelectedCity('');
              setSelectedEduLevel('');
            }}
            className="px-4 py-2 rounded-lg bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700 transition-colors"
          >
            Filtreleri Sıfırla
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredList.map((announcement) => {
            const { matchSummary, daysLeft } = announcement;
            const positions = announcement.positions || [];
            const totalQuota = positions.reduce((sum, p) => sum + (p.quota || 1), 0);

            let borderStyle = 'border-slate-200 hover:border-slate-300';
            let badgeComponent = null;

            if (hasProfileFilled) {
              if (matchSummary.suitableCount > 0) {
                borderStyle = 'border-emerald-200 hover:border-emerald-300 bg-gradient-to-r from-emerald-50/30 to-white';
                badgeComponent = (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Profilinize Uygun {matchSummary.suitableCount} Kadro Var!</span>
                  </div>
                );
              } else if (matchSummary.maybeCount > 0) {
                borderStyle = 'border-amber-200 hover:border-amber-300 bg-gradient-to-r from-amber-50/20 to-white';
                badgeComponent = (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-300">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Belki Uygun ({matchSummary.maybeCount} Kadro Şart İncelemesi İstiyor)</span>
                  </div>
                );
              } else {
                badgeComponent = (
                  <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200">
                    <XCircle className="w-3.5 h-3.5 text-slate-400" />
                    <span>Şartlar Uymuyor</span>
                  </div>
                );
              }
            }

            // Geri Sayım Rozeti
            let deadlineBadge = null;
            if (daysLeft < 0) {
              deadlineBadge = <span className="text-xs font-semibold text-slate-400">Süresi Doldu</span>;
            } else if (daysLeft === 0) {
              deadlineBadge = (
                <span className="px-2.5 py-1 rounded-full bg-rose-600 text-white text-xs font-bold badge-pulse">
                  Bugün Son Gün!
                </span>
              );
            } else if (daysLeft <= 3) {
              deadlineBadge = (
                <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200">
                  Son {daysLeft} Gün!
                </span>
              );
            } else {
              deadlineBadge = (
                <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Son: {new Date(announcement.deadline).toLocaleDateString('tr-TR')} ({daysLeft} gün)
                </span>
              );
            }

            return (
              <div
                key={announcement.id}
                className={`p-5 rounded-2xl bg-white border ${borderStyle} shadow-sm hover:shadow-md transition-all space-y-4`}
              >
                {/* Üst Bar: Kurum, Tarih ve Uyumluluk Rozeti */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs uppercase border border-slate-200">
                      {announcement.institution.slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {announcement.institution}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                          {announcement.source === 'RESMI_GAZETE' ? 'Resmî Gazete' : 'Kariyer Kapısı'}
                        </span>
                        <span>•</span>
                        <span>Yayım: {new Date(announcement.publish_date).toLocaleDateString('tr-TR')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {badgeComponent}
                    {deadlineBadge}
                  </div>
                </div>

                {/* İlan Başlığı ve Özeti */}
                <div>
                  <Link
                    href={`/ilan/${announcement.id}`}
                    className="text-base sm:text-lg font-bold text-slate-900 hover:text-sky-600 transition-colors line-clamp-2"
                  >
                    {announcement.title}
                  </Link>
                  {announcement.raw_summary && (
                    <p className="text-xs sm:text-sm text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                      {announcement.raw_summary}
                    </p>
                  )}
                </div>

                {/* Kadro Önizlemeleri & Etiketler */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 font-semibold border border-sky-100">
                      <Users className="w-3.5 h-3.5" />
                      {totalQuota} Kontenjan
                    </span>

                    {/* Kadro Unvan Etiketleri */}
                    {positions.slice(0, 3).map((p) => (
                      <span
                        key={p.id}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium truncate max-w-[200px]"
                      >
                        {p.title} ({p.quota})
                      </span>
                    ))}

                    {positions.length > 3 && (
                      <span className="text-slate-400 font-medium">
                        +{positions.length - 3} kadro daha
                      </span>
                    )}
                  </div>

                  {/* Detay Butonu */}
                  <Link
                    href={`/ilan/${announcement.id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-sky-600 text-white text-xs font-bold transition-all shadow-sm"
                  >
                    <span>Şart Karşılaştırmasını Gör</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
