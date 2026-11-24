'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Heart, 
  Building2, 
  MapPin, 
  Calendar, 
  Clock, 
  ExternalLink, 
  ChevronRight, 
  CheckCircle2, 
  HelpCircle, 
  AlertTriangle, 
  Trash2, 
  Sparkles,
  Users,
  GraduationCap
} from 'lucide-react';
import { useUserProfile } from '@/lib/context/user-profile-context';
import { SAMPLE_ANNOUNCEMENTS } from '@/lib/sample-data';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { computeAnnouncementMatch } from '@/lib/matcher';
import { Announcement } from '@/types';
import { WhatsAppIcon } from '@/components/WhatsAppIcon';
import { openWhatsappShare } from '@/lib/share';

export default function FavoritesPage() {
  const { profile, hasProfileFilled, favorites, toggleFavorite, clearFavorites } = useUserProfile();
  const [announcements, setAnnouncements] = useState<Announcement[]>(SAMPLE_ANNOUNCEMENTS);
  const [loading, setLoading] = useState(false);

  // Supabase'den canlı ilanları çek ve birleştir
  useEffect(() => {
    async function fetchAnnouncements() {
      if (!isSupabaseConfigured || !supabase) return;

      try {
        setLoading(true);
        const { data: annData, error: annError } = await (supabase as any)
          .from('announcements')
          .select('*')
          .eq('status', 'ACTIVE')
          .order('deadline', { ascending: true });

        if (annData && !annError && annData.length > 0) {
          const annIds = annData.map((a: any) => a.id);
          const { data: posData } = await (supabase as any)
            .from('positions')
            .select('*')
            .in('announcement_id', annIds);

          const liveAnnouncements: Announcement[] = annData.map((ann: any) => ({
            ...ann,
            positions: (posData || []).filter((p: any) => p.announcement_id === ann.id),
          }));

          const sampleIds = new Set(SAMPLE_ANNOUNCEMENTS.map(s => s.id));
          const sampleUrls = new Set(SAMPLE_ANNOUNCEMENTS.map(s => s.source_url));
          const nowMs = Date.now();
          const uniqueLive = liveAnnouncements.filter(l => 
            !sampleIds.has(l.id) &&
            !sampleUrls.has(l.source_url) &&
            l.is_active === true &&
            !l.title.includes('450 Sözleşmeli') &&
            !l.title.includes('60 Sözleşmeli') &&
            (l.source_url?.includes('.gov.tr') || l.source_url?.includes('.edu.tr') || l.source_url?.includes('resmigazete.gov.tr')) &&
            new Date(l.deadline).getTime() >= (nowMs - 24 * 60 * 60 * 1000)
          );
          setAnnouncements([...SAMPLE_ANNOUNCEMENTS, ...uniqueLive]);
        }
      } catch (err) {
        console.warn('Canlı ilanlar çekilirken hata alındı:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchAnnouncements();
  }, []);

  // Yalnızca favorilere eklenmiş ilanlar
  const favoriteAnnouncements = useMemo(() => {
    return announcements
      .filter((ann) => favorites.includes(ann.id))
      .map((ann) => {
        const matchSummary = computeAnnouncementMatch(profile, ann.positions || []);
        const dDate = new Date(ann.deadline);
        const now = new Date();
        const diffDays = Math.ceil((dDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const daysLeft = diffDays < 0 ? 0 : diffDays;
        const isUpcoming = ann.application_start_date ? new Date(ann.application_start_date) > now : false;

        return {
          ...ann,
          matchSummary,
          daysLeft,
          isUpcoming,
          startDate: ann.application_start_date ? new Date(ann.application_start_date) : null,
        };
      });
  }, [announcements, favorites, profile]);

  // Toplam kontenjan hesabı
  const totalFavoriteQuota = useMemo(() => {
    return favoriteAnnouncements.reduce((acc, ann) => {
      const posQuota = (ann.positions || []).reduce((sum, p) => sum + (p.quota || 1), 0);
      return acc + posQuota;
    }, 0);
  }, [favoriteAnnouncements]);

  return (
    <div className="bg-[#faf8f5] min-h-screen py-8 text-slate-800">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Üst Gezinme */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[#1b4332] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Tüm İlanlara Dön</span>
          </Link>

          {favorites.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Tüm favori ilanlarınızı temizlemek istediğinize emin misiniz?')) {
                  clearFavorites();
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Favorileri Temizle</span>
            </button>
          )}
        </div>

        {/* Başlık Banner */}
        <div className="bg-gradient-to-r from-[#1b4332] to-[#2d6a4f] rounded-3xl p-6 sm:p-8 text-white shadow-md space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-rose-200 text-xs font-semibold border border-white/20">
            <Heart className="w-3.5 h-3.5 fill-rose-300 text-rose-300" />
            <span>Kişisel Takip Listeniz</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Favori Kamu İlanlarım
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100/80 max-w-xl leading-relaxed mt-1">
                İncelemek üzere kaydettiğiniz açık pozisyonlar ve başvuru takvimi.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-3 text-center min-w-[90px]">
                <p className="text-[10px] text-emerald-200 font-bold uppercase tracking-wider">KAYITLI İLAN</p>
                <p className="text-xl font-black font-mono">{favoriteAnnouncements.length}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-3 text-center min-w-[90px]">
                <p className="text-[10px] text-emerald-200 font-bold uppercase tracking-wider">TOPLAM KADRO</p>
                <p className="text-xl font-black font-mono">{totalFavoriteQuota.toLocaleString('tr-TR')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* İLAN LİSTESİ VEYA BOŞ DURUM */}
        {favoriteAnnouncements.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#e5dfd5] p-12 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto shadow-inner">
              <Heart className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800">
                Henüz Favori İlanınız Yok
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                İlan akışında gezinirken ilgilendiğiniz ilanların üzerindeki <strong className="text-rose-600">Favori</strong> butonuna basarak ilanları buraya kaydedebilir, son başvuru tarihlerini kolayca takip edebilirsiniz.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#1b4332] hover:bg-[#2d6a4f] text-white text-xs font-bold transition-all shadow-md shadow-emerald-950/10"
              >
                <span>Açık İlanları Keşfet</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {favoriteAnnouncements.map((announcement) => {
              const { matchSummary, daysLeft } = announcement;
              const positions = announcement.positions || [];
              const totalQuota = positions.reduce((sum, p) => sum + (p.quota || 1), 0);
              const dDate = new Date(announcement.deadline);
              const monthName = dDate.toLocaleString('tr-TR', { month: 'short' }).toUpperCase();
              const dayNum = dDate.getDate();
              const hours = dDate.getHours().toString().padStart(2, '0');
              const minutes = dDate.getMinutes().toString().padStart(2, '0');

              return (
                <div
                  key={announcement.id}
                  className="bg-white rounded-2xl border border-[#e5dfd5] p-5 hover:border-slate-300 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex flex-col gap-4">
                    
                    {/* ÜST BİLGİ VE TAKVİM KUTUSU */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-[#ece7df] text-slate-700 flex items-center justify-center font-black text-sm flex-shrink-0 tracking-tight shadow-sm border border-[#e5dfd5]">
                          {announcement.institution.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight leading-snug">
                            {announcement.institution}
                          </h3>
                          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                            {announcement.title}
                          </p>
                        </div>
                      </div>

                      {/* TAKVİM KUTUCUĞU */}
                      {announcement.isUpcoming ? (
                        <div className="w-16 h-16 rounded-xl border border-blue-300 overflow-hidden text-center flex-shrink-0 bg-blue-50/50 flex flex-col justify-between shadow-sm">
                          <div className="bg-blue-600 text-white text-[10px] font-black py-0.5 uppercase tracking-wider">
                            BAŞLANGIÇ
                          </div>
                          <div className="font-black text-lg text-blue-950 leading-tight">
                            {announcement.startDate ? announcement.startDate.getDate() : ''}
                          </div>
                          <div className="text-[10px] text-blue-700 font-bold pb-0.5">
                            {announcement.startDate ? announcement.startDate.toLocaleString('tr-TR', { month: 'short' }).toUpperCase() : ''}
                          </div>
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-xl border border-red-200 overflow-hidden text-center flex-shrink-0 bg-white flex flex-col justify-between shadow-sm">
                          <div className="bg-[#b91c1c] text-white text-[10px] font-black py-0.5 uppercase tracking-wider">
                            {monthName}
                          </div>
                          <div className="font-black text-xl text-slate-900 leading-tight">
                            {dayNum}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono pb-0.5">
                            {hours}:{minutes}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ETİKETLER */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                      {positions.slice(0, 2).map((pos, pIdx) => (
                        <span key={pIdx} className="px-2.5 py-1 rounded-lg bg-[#f0f9ff] text-sky-800 border border-sky-100">
                          {pos.title}
                        </span>
                      ))}
                      {positions.length > 2 && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-mono">
                          +{positions.length - 2} kadro
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        <span>{positions[0]?.cities?.slice(0, 2).join(', ') || 'TÜRKİYE GENELİ'}</span>
                      </span>

                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                        <Users className="w-3 h-3 text-slate-500" />
                        <span>{totalQuota} kişi</span>
                      </span>

                      {positions[0]?.exam_type && (
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600">
                          {positions[0].exam_type === 'KPSS_PUAN_USTUNLUGU' ? 'Mülakatsız' : 'Mülakat var'}
                        </span>
                      )}
                    </div>

                    {/* KADRO & KOŞUL ÖZETİ */}
                    <div className="bg-[#faf8f5] rounded-xl p-3 border border-[#ece7df] text-xs space-y-1.5 font-medium text-slate-600">
                      <div className="flex gap-2">
                        <span className="font-extrabold text-slate-400 uppercase text-[10px] tracking-wider w-16 flex-shrink-0">KADROLAR:</span>
                        <span className="text-slate-800 font-bold truncate">
                          {positions.map(p => p.title).join(', ') || 'Belirtilmemiş'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-extrabold text-slate-400 uppercase text-[10px] tracking-wider w-16 flex-shrink-0">KOŞULLAR:</span>
                        <span className="text-slate-700 truncate">
                          {positions.map(p => `${p.is_any_department ? 'Tüm Bölümler' : (p.allowed_departments?.slice(0, 2).join(', ') || 'Belirtilmemiş')} • ${p.education_level}${p.min_kpss_score ? ` • KPSS: ${p.min_kpss_score}` : ''}`).join(' | ')}
                        </span>
                      </div>
                    </div>

                    {/* UYGUNLUK ROZETİ */}
                    {hasProfileFilled && matchSummary.suitableCount > 0 && (
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-[#1b4332] flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span className="font-semibold text-[11px]">
                          Bölüm ve KPSS kriterleriniz bu ilandaki <strong>{matchSummary.suitableCount} kadronun</strong> şartlarını karşılıyor!
                        </span>
                      </div>
                    )}

                    {/* ALT BUTONLAR */}
                    <div className="pt-1 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
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

                        {/* WhatsApp Butonu */}
                        <button
                          type="button"
                          onClick={() => openWhatsappShare(announcement)}
                          className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                          title="WhatsApp ile Arkadaşına Gönder"
                        >
                          <WhatsAppIcon className="w-4 h-4 text-emerald-600" />
                          <span>WhatsApp</span>
                        </button>

                        {/* Favoriden Çıkar Butonu */}
                        <button
                          type="button"
                          onClick={() => toggleFavorite(announcement.id)}
                          className="p-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-100 transition-colors flex items-center gap-1.5"
                          title="Favorilerden Çıkar"
                        >
                          <Heart className="w-4 h-4 fill-rose-600 text-rose-600" />
                          <span>Favorilerden Çıkar</span>
                        </button>
                      </div>

                      <Link
                        href={`/ilan/${announcement.id}`}
                        className="text-xs font-bold text-slate-700 hover:text-[#1b4332] flex items-center gap-1 hover:underline"
                      >
                        <span>Şartları & Kadroları İncele</span>
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
