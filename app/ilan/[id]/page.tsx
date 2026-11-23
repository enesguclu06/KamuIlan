'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Building2, 
  Calendar, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Users, 
  MapPin, 
  GraduationCap, 
  Award, 
  Clock, 
  ShieldAlert, 
  FileCheck2,
  Share2,
  ChevronDown,
  Info
} from 'lucide-react';
import { Announcement, Position, MatchEvaluation } from '@/types';
import { SAMPLE_ANNOUNCEMENTS } from '@/lib/sample-data';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { useUserProfile } from '@/lib/context/user-profile-context';
import { evaluateMatch } from '@/lib/matcher';

export default function AnnouncementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useUserProfile();
  const id = params?.id as string;

  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadAnnouncement() {
      setLoading(true);

      // 1. Önce örnek veride var mı bak
      const foundInSample = SAMPLE_ANNOUNCEMENTS.find((a) => a.id === id);
      if (foundInSample) {
        setAnnouncement(foundInSample);
        setLoading(false);
        return;
      }

      // 2. Supabase bağlıysa veritabanından çek
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('announcements')
            .select(`
              *,
              positions (*)
            `)
            .eq('id', id)
            .single();

          if (data && !error) {
            setAnnouncement(data as Announcement);
          }
        } catch (e) {
          console.warn('İlan detayı çekilirken hata oluştu:', e);
        }
      }

      setLoading(false);
    }

    if (id) {
      loadAnnouncement();
    }
  }, [id]);

  const positionsWithMatch = useMemo(() => {
    if (!announcement || !announcement.positions) return [];
    return announcement.positions.map((pos) => {
      const evaluation = evaluateMatch(profile, pos, announcement.deadline);
      return {
        position: pos,
        evaluation,
      };
    });
  }, [announcement, profile]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-semibold text-slate-500">İlan detayları yükleniyor...</p>
      </div>
    );
  }

  if (!announcement) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">İlan Bulunamadı</h2>
        <p className="text-sm text-slate-500">Aradığınız ilan yayından kaldırılmış veya bağlantı hatalı olabilir.</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          İlan Akışına Dön
        </Link>
      </div>
    );
  }

  const daysLeft = Math.ceil(
    (new Date(announcement.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Üst Gezinme & Paylaşım */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Tüm İlanlara Dön
        </Link>
        <button
          onClick={handleShare}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>{copied ? 'Link Kopyalandı!' : 'İlanı Paylaş'}</span>
        </button>
      </div>

      {/* Ana Başlık & Kurum Kartı */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-700 text-white flex items-center justify-center font-black text-xl shadow-md">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs uppercase font-extrabold text-sky-600 tracking-wider">
                {announcement.institution}
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 leading-snug">
                {announcement.title}
              </h1>
            </div>
          </div>

          {/* Son Başvuru Durumu Rozeti */}
          <div className="flex flex-col items-end gap-1">
            {daysLeft > 0 ? (
              <span className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-extrabold border border-rose-200">
                Son {daysLeft} Gün!
              </span>
            ) : (
              <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold">
                Süresi Sona Erdi
              </span>
            )}
            <span className="text-xs text-slate-500">
              Bitiş: {new Date(announcement.deadline).toLocaleDateString('tr-TR')}
            </span>
          </div>
        </div>

        {/* İlanın Kısa Özeti */}
        {announcement.raw_summary && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 mb-1">
              <Info className="w-3.5 h-3.5 text-sky-600" />
              <span>İlanın Kısa Özeti</span>
            </div>
            {announcement.raw_summary}
          </div>
        )}

        {/* Bilgi Kutucukları Matrisi */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Yayım Tarihi</span>
            <p className="text-xs font-semibold text-slate-800">
              {new Date(announcement.publish_date).toLocaleDateString('tr-TR')}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Resmi Kaynak</span>
            <p className="text-xs font-semibold text-slate-800 truncate">
              {announcement.source === 'RESMI_GAZETE' ? 'Resmî Gazete Çeşitli İlanlar' : 'Cumhurbaşkanlığı Kariyer Kapısı'}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Toplam Kadro</span>
            <p className="text-xs font-semibold text-slate-800">
              {announcement.positions?.length || 0} Farklı Pozisyon ({announcement.positions?.reduce((a, b) => a + b.quota, 0)} Kişi)
            </p>
          </div>
        </div>

        {/* Başvuru Aksiyon Butonları */}
        <div className="pt-2 flex flex-wrap items-center gap-3">
          <a
            href={announcement.application_method.includes('http') ? announcement.application_method.match(/https?:\/\/[^\s)]+/)?.[0] || 'https://isealimkariyerkapisi.cbiko.gov.tr' : 'https://isealimkariyerkapisi.cbiko.gov.tr'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold shadow-md shadow-sky-600/20 transition-all"
          >
            <span>Resmi Başvuru Ekranına Git</span>
            <ExternalLink className="w-4 h-4" />
          </a>

          {announcement.source_url && (
            <a
              href={announcement.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold border border-slate-300 transition-colors"
            >
              <span>Orijinal İlan / PDF Dökümü</span>
              <FileCheck2 className="w-4 h-4 text-slate-500" />
            </a>
          )}
        </div>
      </div>

      {/* Profil Eşleştirme Bilgilendirme Notu */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-sky-50 border border-sky-200 text-xs sm:text-sm text-sky-900">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-sky-600 flex-shrink-0" />
          <span>
            Karşılaştırma profili: <strong>{profile?.department || 'Bölüm Tanımsız'}</strong> | {profile?.education_level || 'Eğitim Düzeyi'} {profile?.kpss_score ? `| KPSS: ${profile.kpss_score}` : ''} {profile?.ales_score ? `| ALES: ${profile.ales_score}` : ''} {profile?.yds_score ? `| Dil: ${profile.yds_score}` : ''}
          </span>
        </div>
        <Link href="/profil" className="font-bold text-sky-700 hover:underline flex-shrink-0">
          Kriterleri Güncelle
        </Link>
      </div>

      {/* KADROLAR VE ŞART KARŞILAŞTIRMA LİSTESİ */}
      <div className="space-y-6">
        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
          <span>Açık Kadrolar ve Profil Uyum Tablosu</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">
            {positionsWithMatch.length}
          </span>
        </h2>

        <div className="space-y-6">
          {positionsWithMatch.map(({ position, evaluation }, index) => {
            const isSuitable = evaluation.status === 'UYGUN';
            const isMaybe = evaluation.status === 'BELKI';
            const isUnfit = evaluation.status === 'UYMADI';

            let headerBg = 'bg-slate-50 border-slate-200';
            let badgeBg = 'bg-slate-100 text-slate-700 border-slate-200';
            let badgeText = 'Şartlar Uymuyor';
            let BadgeIcon = XCircle;

            if (isSuitable) {
              headerBg = 'bg-emerald-50/50 border-emerald-300';
              badgeBg = 'bg-emerald-100 text-emerald-800 border-emerald-300';
              badgeText = 'BU KADRO SİZE UYGUN!';
              BadgeIcon = CheckCircle2;
            } else if (isMaybe) {
              headerBg = 'bg-amber-50/50 border-amber-300';
              badgeBg = 'bg-amber-100 text-amber-800 border-amber-300';
              badgeText = 'BELKİ UYGUN (ŞARTLARI İNCELEYİN)';
              BadgeIcon = AlertCircle;
            }

            const { criteriaMatrix } = evaluation;

            return (
              <div
                key={position.id || index}
                className={`bg-white rounded-2xl border ${headerBg} shadow-sm overflow-hidden transition-all`}
              >
                {/* Kadro Kart Başlığı */}
                <div className="p-5 sm:p-6 border-b border-slate-100 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-400">#{index + 1}</span>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900">
                          {position.title}
                        </h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold text-slate-700">
                          {position.quota} Kontenjan
                        </span>
                        <span>•</span>
                        <span>Eğitim: {position.education_level}</span>
                        <span>•</span>
                        <span>{position.cities.join(', ')}</span>
                      </div>
                    </div>

                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold border ${badgeBg}`}>
                      <BadgeIcon className="w-4 h-4" />
                      <span>{badgeText}</span>
                    </div>
                  </div>

                  {/* Neden Uygun / Belki / Uymadı Açıklaması */}
                  <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 space-y-1">
                    <p className="font-bold text-slate-900">Eşleştirme Sonucu:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                      {evaluation.reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* DETAYLI ŞART KARŞILAŞTIRMA MATRİSİ */}
                <div className="p-5 sm:p-6 bg-slate-50/50 space-y-4">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Şart Karşılaştırma Matrisi
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    
                    {/* 1. KPSS Karşılaştırması */}
                    <div className={`p-3 rounded-xl border bg-white ${criteriaMatrix.kpss.match ? 'border-emerald-200' : 'border-rose-200'}`}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-slate-500">KPSS Şartı</span>
                        {criteriaMatrix.kpss.match ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-600" />
                        )}
                      </div>
                      <p className="text-xs text-slate-800">
                        <strong>İstenen:</strong> {criteriaMatrix.kpss.required}
                      </p>
                      <p className="text-xs text-slate-500">
                        <strong>Senin:</strong> {criteriaMatrix.kpss.user}
                      </p>
                    </div>

                    {/* 2. Bölüm Karşılaştırması */}
                    <div className={`p-3 rounded-xl border bg-white ${criteriaMatrix.department.match ? 'border-emerald-200' : 'border-rose-200'}`}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-slate-500">Mezuniyet Bölümü</span>
                        {criteriaMatrix.department.match ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-600" />
                        )}
                      </div>
                      <p className="text-xs text-slate-800 truncate" title={criteriaMatrix.department.required}>
                        <strong>İstenen:</strong> {criteriaMatrix.department.required}
                      </p>
                      <p className="text-xs text-slate-500 truncate" title={criteriaMatrix.department.user}>
                        <strong>Senin:</strong> {criteriaMatrix.department.user}
                      </p>
                    </div>

                    {/* 3. Yaş Karşılaştırması */}
                    <div className={`p-3 rounded-xl border bg-white ${criteriaMatrix.age.match ? 'border-emerald-200' : 'border-rose-200'}`}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-slate-500">Yaş Sınırı</span>
                        {criteriaMatrix.age.match ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-600" />
                        )}
                      </div>
                      <p className="text-xs text-slate-800">
                        <strong>İstenen:</strong> {criteriaMatrix.age.required}
                      </p>
                      <p className="text-xs text-slate-500">
                        <strong>Senin:</strong> {criteriaMatrix.age.user}
                      </p>
                    </div>

                    {/* 4. Yabancı Dil (YDS) */}
                    <div className={`p-3 rounded-xl border bg-white ${criteriaMatrix.yds.match ? 'border-emerald-200' : 'border-amber-200'}`}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-slate-500">YDS / YÖKDİL</span>
                        {criteriaMatrix.yds.match ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-amber-600" />
                        )}
                      </div>
                      <p className="text-xs text-slate-800">
                        <strong>İstenen:</strong> {criteriaMatrix.yds.required}
                      </p>
                      <p className="text-xs text-slate-500">
                        <strong>Senin:</strong> {criteriaMatrix.yds.user}
                      </p>
                    </div>

                    {/* 5. ALES (Varsa) */}
                    {criteriaMatrix.ales && (
                      <div className={`p-3 rounded-xl border bg-white ${criteriaMatrix.ales.match ? 'border-emerald-200' : 'border-rose-200'}`}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold text-slate-500">ALES Şartı</span>
                          {criteriaMatrix.ales.match ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-600" />
                          )}
                        </div>
                        <p className="text-xs text-slate-800">
                          <strong>İstenen:</strong> {criteriaMatrix.ales.required}
                        </p>
                        <p className="text-xs text-slate-500">
                          <strong>Senin:</strong> {criteriaMatrix.ales.user}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Sınav ve Yerleştirme Türü */}
                  <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
                    <span className="font-bold text-slate-700">Yerleştirme Yöntemi:</span>
                    <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200 font-semibold text-slate-800">
                      {position.exam_type === 'KPSS_PUAN_USTUNLUGU'
                        ? 'Mülakatsız Doğrudan KPSS Sıralaması'
                        : position.exam_type === 'UYGULAMALI'
                        ? 'Uygulamalı Sınav (Klavye/Fiziki Parkur)'
                        : 'Sözlü Sınav / Mülakat'}
                    </span>
                  </div>

                  {/* Özel Şartlar / İstenen Belgeler */}
                  {position.special_conditions && position.special_conditions.length > 0 && (
                    <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 space-y-1">
                      <span className="font-bold flex items-center gap-1 text-amber-950">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        Özel Şartlar ve İstenen Belgeler:
                      </span>
                      <ul className="list-disc list-inside space-y-0.5">
                        {position.special_conditions.map((sc, i) => (
                          <li key={i}>{sc}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
