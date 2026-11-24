'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  UserCheck, 
  GraduationCap, 
  Award, 
  CheckCircle2, 
  Save, 
  Sparkles, 
  Info, 
  HelpCircle, 
  ShieldCheck, 
  Calendar,
  AlertCircle,
  BookOpen,
  MapPin,
  ArrowRight,
  RotateCcw,
  Plus,
  Trash2
} from 'lucide-react';
import { useUserProfile } from '@/lib/context/user-profile-context';
import { 
  UserProfile, 
  EducationLevel, 
  KpssType, 
  AlesType, 
  YdsLevel, 
  GraduationStatus, 
  MilitaryStatus,
  LanguageExamType,
  SpecialStatus,
  EducationRecord
} from '@/types';
import { POPULAR_DEPARTMENTS, SAMPLE_ANNOUNCEMENTS } from '@/lib/sample-data';
import { computeAnnouncementMatch, calculateAge, scoreToYdsLevel } from '@/lib/matcher';

const CERTIFICATE_OPTIONS = [
  'B Sınıfı Ehliyet',
  'C Sınıfı Ehliyet',
  'D Sınıfı Ehliyet',
  'Silahsız Özel Güvenlik Kartı',
  'Silahlı Özel Güvenlik Kartı',
  'MEB Onaylı Bilgisayar İşletmenliği Sertifikası',
  'Zabıt Katipliği / Hızlı Klavye Sertifikası',
  'Aşçılık Ustalık Belgesi',
  'Aşçılık Kalfalık Belgesi',
  'Fırıncılık / Pastacılık Ustalık Belgesi',
  'Elektrik / Tesisat Ustalık Belgesi',
  'SRC 1 / SRC 2 Belgesi (Yolcu Taşımacılığı)',
  'SRC 3 / SRC 4 Belgesi (Yük & Eşya)',
  'Psikoteknik Değerlendirme Raporu',
  'İlk Yardım Sertifikası',
  'Hijyen Eğitimi Belgesi',
  'İş Sağlığı ve Güvenliği (İSG) Belgesi'
];

const SPECIAL_STATUS_OPTIONS: { id: SpecialStatus; label: string; sub?: string }[] = [
  { id: 'ESKI_HUKUMLU', label: 'Eski hükümlü' },
  { id: 'TMY', label: 'Terörle mücadelede malul', sub: 'TMY' },
  { id: 'ENGELLI', label: 'Engelli' },
  { id: 'SEHIT_GAZI_YAKINI', label: 'Şehit yakını / gazi' },
  { id: 'ISKUR_ONCELIK', label: 'İŞKUR öncelik hakkım var', sub: 'afetzede, terörle mücadele yaralısı ...' }
];

const LANGUAGE_EXAM_TYPES: { id: LanguageExamType; label: string }[] = [
  { id: 'YDS', label: 'YDS (Yabancı Dil Bilgisi Seviye Tespit Sınavı)' },
  { id: 'YOKDIL', label: 'YÖKDİL (Yükseköğretim Kurumları Yabancı Dil Sınavı)' },
  { id: 'E_YDS', label: 'e-YDS (Elektronik YDS)' },
  { id: 'TOEFL', label: 'TOEFL / Diğer ÖSYM Eşdeğeri' },
  { id: 'YOK', label: 'Sınava Girmedim / Dil Puanım Yok' }
];

const LANGUAGES = [
  'İngilizce',
  'Almanca',
  'Fransızca',
  'Arapça',
  'Rusça',
  'Farsça',
  'İspanyolca',
  'İtalyanca',
  'Çince',
  'Diğer'
];

const EXAM_YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020];

const CITIES = [
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

export default function ProfilePage() {
  const router = useRouter();
  const { profile, updateProfile, resetProfile, isLoggedIn, userEmail } = useUserProfile();

  const [formData, setFormData] = useState<UserProfile>({
    full_name: '',
    birth_date: '',
    gender: 'BELIRTILMEMIS',
    height: undefined,
    weight: undefined,
    military_status: 'YOK',
    education_level: 'LISANS',
    department: '',
    graduation_status: 'MEZUN',
    graduation_year: undefined,
    expected_graduation_date: '',
    kpss_type: 'KPSSP3',
    kpss_score: undefined,
    ales_type: 'ESIT_AGIRLIK',
    ales_score: undefined,
    yds_level: 'YOK',
    yds_score: undefined,
    language_exam_type: 'YDS',
    foreign_language: 'İngilizce',
    language_exam_year: 2024,
    special_statuses: [],
    has_computer_course: false,
    experience_field: '',
    experience_years: undefined,
    has_sgk_service: false,
    additional_educations: [],
    certificates: [],
    preferred_cities: [],
    residence_city: '',
    telegram_chat_id: '',
    notify_enabled: false,
  });

  const [departmentSearch, setDepartmentSearch] = useState('');
  const [departmentSuggestions, setDepartmentSuggestions] = useState<string[]>([]);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Mevcut profili forma yükle
  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        ...profile,
        language_exam_type: profile.language_exam_type || 'YDS',
        foreign_language: profile.foreign_language || 'İngilizce',
        language_exam_year: profile.language_exam_year || 2024,
        special_statuses: profile.special_statuses || [],
        has_computer_course: profile.has_computer_course || false,
        experience_field: profile.experience_field || '',
        experience_years: profile.experience_years ?? undefined,
        has_sgk_service: profile.has_sgk_service || false,
        additional_educations: profile.additional_educations || [],
      }));
      setDepartmentSearch(profile.department || '');
    }
  }, [profile]);

  // Bölüm otomatik tamamlama
  useEffect(() => {
    if (!departmentSearch.trim()) {
      setDepartmentSuggestions(POPULAR_DEPARTMENTS.slice(0, 8));
      return;
    }
    const filtered = POPULAR_DEPARTMENTS.filter(d =>
      d.toLowerCase().includes(departmentSearch.toLowerCase())
    );
    setDepartmentSuggestions(filtered.slice(0, 10));
  }, [departmentSearch]);

  const handleCertificateToggle = (cert: string) => {
    const current = formData.certificates || [];
    if (current.includes(cert)) {
      setFormData({ ...formData, certificates: current.filter(c => c !== cert) });
    } else {
      setFormData({ ...formData, certificates: [...current, cert] });
    }
  };

  const handleSpecialStatusToggle = (status: SpecialStatus) => {
    const current = formData.special_statuses || [];
    if (current.includes(status)) {
      setFormData({ ...formData, special_statuses: current.filter(s => s !== status) });
    } else {
      setFormData({ ...formData, special_statuses: [...current, status] });
    }
  };

  // Puan girildiğinde otomatik YDS seviyesi atama
  const handleLanguageScoreChange = (scoreVal: string) => {
    if (!scoreVal || scoreVal.trim() === '') {
      setFormData({
        ...formData,
        yds_score: undefined,
        yds_level: 'YOK'
      });
      return;
    }
    const num = parseFloat(scoreVal);
    if (isNaN(num)) {
      setFormData({ ...formData, yds_score: undefined });
      return;
    }
    const autoLevel = scoreToYdsLevel(num);
    setFormData({
      ...formData,
      yds_score: num,
      yds_level: autoLevel
    });
  };

  const handleAddEducation = () => {
    const current = formData.additional_educations || [];
    setFormData({
      ...formData,
      additional_educations: [
        ...current,
        {
          education_level: 'ONLISANS',
          department: '',
          graduation_status: 'MEZUN',
        }
      ]
    });
  };

  const handleUpdateEducation = (index: number, updated: Partial<EducationRecord>) => {
    const current = [...(formData.additional_educations || [])];
    current[index] = { ...current[index], ...updated };
    setFormData({ ...formData, additional_educations: current });
  };

  const handleRemoveEducation = (index: number) => {
    const current = [...(formData.additional_educations || [])];
    current.splice(index, 1);
    setFormData({ ...formData, additional_educations: current });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile(formData);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      router.push('/');
    }, 1200);
  };

  const calculatedAge = useMemo(() => {
    return calculateAge(formData.birth_date);
  }, [formData.birth_date]);

  // Canlı eşleşme önizlemesi
  const matchingSummary = useMemo(() => {
    let totalSuitable = 0;
    SAMPLE_ANNOUNCEMENTS.forEach((ann) => {
      const match = computeAnnouncementMatch(formData, ann.positions || []);
      totalSuitable += match.suitableCount;
    });
    return totalSuitable;
  }, [formData]);

  return (
    <div className="bg-[#faf8f5] min-h-screen py-8 text-slate-800">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Başlık Banner (Memuryolu Forest Green) */}
        <div className="bg-[#1b4332] rounded-3xl p-6 sm:p-8 text-white shadow-md space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-emerald-200 text-xs font-semibold border border-white/20">
            <GraduationCap className="w-3.5 h-3.5 text-emerald-300" />
            <span>Aday Bilgi ve Tercih Merkezi</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Kriterlerinizi Belirleyin, Size Uyan İlanları Anında Görün
          </h1>
          <p className="text-sm text-emerald-100/80 max-w-2xl leading-relaxed">
            Bölümünüzü, mezuniyet durumunuzu, KPSS, ALES ve YDS puanlarınızı girin. Sistem tüm kamu kadrolarını analiz edip şartlarını sağladığınız ilanları yeşil rozetle öne çıkarsın.
          </p>

          {/* Canlı Eşleşme Bildirimi */}
          {formData.department && (
            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
              <span className="text-emerald-100/70">Şu anki kriterlerinizle uyuşan aktif kadro:</span>
              <span className="text-white font-bold font-mono text-xs px-3 py-1 rounded-full bg-emerald-800/80 border border-emerald-600">
                {matchingSummary} Kadro Tam Uyumlu
              </span>
            </div>
          )}
        </div>

        {savedSuccess && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-sm font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>Kriterleriniz başarıyla kaydedildi! İlan akışına yönlendiriliyorsunuz...</span>
            </div>
            <ArrowRight className="w-4 h-4 text-emerald-700" />
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          
          {/* 1. EĞİTİM VE BÖLÜM BİLGİLERİ (EN KRİTİK ALAN) */}
          <div className="bg-white p-6 rounded-2xl border border-[#e5dfd5] shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-[#1b4332]" />
                <span>1. Mezuniyet ve Bölüm Bilgileriniz</span>
              </h2>
              <span className="text-[11px] font-bold text-[#1b4332] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Zorunlu
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Eğitim Düzeyiniz
                </label>
                <select
                  value={formData.education_level || 'LISANS'}
                  onChange={(e) => {
                    const val = e.target.value as EducationLevel;
                    const kpssDefault = val === 'LISANS' ? 'KPSSP3' : (val === 'ONLISANS' ? 'KPSSP93' : 'KPSSP94');
                    setFormData({ ...formData, education_level: val, kpss_type: kpssDefault });
                  }}
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:ring-1 focus:ring-[#1b4332] focus:outline-none bg-white font-semibold text-slate-800"
                >
                  <option value="LISANS">Lisans (4 Yıllık Fakülte)</option>
                  <option value="ONLISANS">Önlisans (2 Yıllık Meslek Yüksekokulu)</option>
                  <option value="LISE">Ortaöğretim / Lise / Meslek Lisesi</option>
                  <option value="YUKSEK_LISANS">Yüksek Lisans / Tezli YL</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mezuniyet Durumu
                </label>
                <select
                  value={formData.graduation_status || 'MEZUN'}
                  onChange={(e) => setFormData({ ...formData, graduation_status: e.target.value as GraduationStatus })}
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:ring-1 focus:ring-[#1b4332] focus:outline-none bg-white"
                >
                  <option value="MEZUN">Mezun (Diplomamı Aldım)</option>
                  <option value="OGRENCI">Halen Öğrenciyim (Son Sınıf / Devam Ediyor)</option>
                </select>
              </div>
            </div>

            {/* Bölüm Arama ve Otomatik Tamamlama */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mezun Olduğunuz / Okuduğunuz Bölüm
              </label>
              <input
                type="text"
                placeholder="Örn: Bilgisayar Mühendisliği, Hukuk, İktisat, Tıbbi Dokümantasyon..."
                value={departmentSearch}
                onChange={(e) => {
                  setDepartmentSearch(e.target.value);
                  setFormData({ ...formData, department: e.target.value });
                }}
                className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:ring-1 focus:ring-[#1b4332] focus:outline-none font-medium"
              />

              {/* Hızlı Seçim Rozetleri */}
              <div className="mt-2.5 flex flex-wrap gap-1.5 items-center">
                <span className="text-[11px] text-slate-400 py-0.5 font-medium">Hızlı Seçim:</span>
                {departmentSuggestions.map((dept) => (
                  <button
                    type="button"
                    key={dept}
                    onClick={() => {
                      setDepartmentSearch(dept);
                      setFormData({ ...formData, department: dept });
                    }}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                      formData.department === dept
                        ? 'bg-[#1b4332] text-white border-[#1b4332] font-bold shadow-sm'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            </div>

            {/* İKİNCİ / EK DİPLOMALAR BÖLÜMÜ */}
            {(formData.additional_educations || []).length > 0 && (
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🎓 İkinci Diploma / Ek Mezuniyetleriniz</span>
                  </span>
                  <span className="text-[11px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    {formData.additional_educations?.length} Ek Diploma
                  </span>
                </div>

                {formData.additional_educations?.map((edu, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">
                        {idx + 2}. Diploma / Mezuniyet Bilgisi
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveEducation(idx)}
                        className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Kaldır</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Eğitim Düzeyi
                        </label>
                        <select
                          value={edu.education_level || 'ONLISANS'}
                          onChange={(e) => handleUpdateEducation(idx, { education_level: e.target.value as EducationLevel })}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:ring-1 focus:ring-[#1b4332] bg-white font-medium"
                        >
                          <option value="LISANS">Lisans (4 Yıllık Fakülte)</option>
                          <option value="ONLISANS">Önlisans (2 Yıllık MYO)</option>
                          <option value="LISE">Ortaöğretim / Lise / Meslek Lisesi</option>
                          <option value="YUKSEK_LISANS">Yüksek Lisans / Tezli YL</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Mezuniyet Durumu
                        </label>
                        <select
                          value={edu.graduation_status || 'MEZUN'}
                          onChange={(e) => handleUpdateEducation(idx, { graduation_status: e.target.value as GraduationStatus })}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:ring-1 focus:ring-[#1b4332] bg-white font-medium"
                        >
                          <option value="MEZUN">Mezun (Diplomamı Aldım)</option>
                          <option value="OGRENCI">Halen Öğrenciyim</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Bölüm / Program Adı
                      </label>
                      <input
                        type="text"
                        placeholder="Örn: Adalet, İlahiyat, Bilgisayar Programcılığı, İktisat..."
                        value={edu.department || ''}
                        onChange={(e) => handleUpdateEducation(idx, { department: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:ring-1 focus:ring-[#1b4332] bg-white font-medium"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* İkinci Diploma Ekleme Aksiyon Butonu */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={handleAddEducation}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all border border-slate-200"
              >
                <Plus className="w-3.5 h-3.5 text-[#1b4332]" />
                <span>+ İkinci Diploma / Ek Bölüm Ekle (Önlisans, Çift Anadal vb.)</span>
              </button>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Sistem her iki diplomanızı da ilanlarla eşleştirir.
              </span>
            </div>
          </div>

          {/* 2. SINAV PUANLARI (KPSS, ALES, YDS / YABANCI DİL) */}
          <div className="bg-white p-6 rounded-2xl border border-[#e5dfd5] shadow-sm space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-[#1b4332]" />
                <span>2. Sınav Puanlarınız (KPSS, ALES, YDS / YÖKDİL)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Hangi sınavlara girdiyseniz puanlarınızı yazın; girmediğiniz alanları boş bırakabilirsiniz.
              </p>
            </div>

            {/* KPSS Bölümü */}
            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 space-y-3">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span>🏛️ Kamu Personel Seçme Sınavı (KPSS)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    KPSS Puan Türünüz
                  </label>
                  <select
                    value={formData.kpss_type || 'KPSSP3'}
                    onChange={(e) => setFormData({ ...formData, kpss_type: e.target.value as KpssType })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:ring-1 focus:ring-[#1b4332] focus:outline-none bg-white font-medium"
                  >
                    <option value="KPSSP3">KPSSP3 (Lisans Düzeyi)</option>
                    <option value="KPSSP93">KPSSP93 (Önlisans Düzeyi)</option>
                    <option value="KPSSP94">KPSSP94 (Ortaöğretim / Lise Düzeyi)</option>
                    <option value="KPSS_YOK">KPSS Puanım Yok (Sadece KPSS Şartsız İlanlar)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    KPSS Puanınız (Örn: 78.45)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="0.00"
                    value={formData.kpss_score ?? ''}
                    onChange={(e) => setFormData({ ...formData, kpss_score: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:ring-1 focus:ring-[#1b4332] focus:outline-none font-mono font-bold text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* ALES Bölümü */}
            <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 space-y-3">
              <h3 className="text-xs font-extrabold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <span>🎓 Akademik Personel ve Lisansüstü Eğitimi Giriş Sınavı (ALES)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ALES Puan Türünüz
                  </label>
                  <select
                    value={formData.ales_type || 'ESIT_AGIRLIK'}
                    onChange={(e) => setFormData({ ...formData, ales_type: e.target.value as AlesType })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:ring-1 focus:ring-[#1b4332] focus:outline-none bg-white font-medium"
                  >
                    <option value="ESIT_AGIRLIK">ALES Eşit Ağırlık</option>
                    <option value="SAYISAL">ALES Sayısal</option>
                    <option value="SOZEL">ALES Sözel</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ALES Puanınız (Varsa)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="Örn: 75.50 (Üniversite ve Uzmanlık ilanları için)"
                    value={formData.ales_score ?? ''}
                    onChange={(e) => setFormData({ ...formData, ales_score: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:ring-1 focus:ring-[#1b4332] focus:outline-none font-mono font-bold text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Yabancı Dil (YDS / YÖKDİL / e-YDS) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/40 border border-emerald-200/90 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-emerald-100 pb-3">
                <div>
                  <h3 className="text-xs font-extrabold text-[#1b4332] uppercase tracking-wider flex items-center gap-1.5">
                    <span>🌍 Yabancı Dil Bilgisi & Sınav Puanı</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    YDS, YÖKDİL veya e-YDS puanınızı girdiğinizde sistem ÖSYM denklik seviyesini (A, B, C, D, E) otomatik atar.
                  </p>
                </div>
                {formData.yds_level && formData.yds_level !== 'YOK' && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#1b4332] text-white text-xs font-bold font-mono shadow-sm">
                    ✓ Seviye: {formData.yds_level} Düzeyi ({formData.yds_score ? `${formData.yds_score} Puan` : 'Aktif'})
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Sınav Türü */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sınav Türü
                  </label>
                  <select
                    value={formData.language_exam_type || 'YDS'}
                    onChange={(e) => setFormData({ ...formData, language_exam_type: e.target.value as LanguageExamType })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-1 focus:ring-[#1b4332] focus:outline-none bg-white font-medium"
                  >
                    {LANGUAGE_EXAM_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>

                {/* Yabancı Dil */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hangi Dil?
                  </label>
                  <select
                    value={formData.foreign_language || 'İngilizce'}
                    onChange={(e) => setFormData({ ...formData, foreign_language: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-1 focus:ring-[#1b4332] focus:outline-none bg-white font-medium"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </div>

                {/* Sınav Yılı */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sınav Yılı <span className="text-[10px] text-slate-400 font-normal">(5 Yıl Geçerlilik)</span>
                  </label>
                  <select
                    value={formData.language_exam_year || 2024}
                    onChange={(e) => setFormData({ ...formData, language_exam_year: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-1 focus:ring-[#1b4332] focus:outline-none bg-white font-medium"
                  >
                    {EXAM_YEARS.map((yr) => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                </div>

                {/* Sayısal Puan ve Otomatik Seviye */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Sınav Puanı (0 - 100)</span>
                    <span className="text-[10px] font-semibold text-emerald-700">Otomatik Seviye</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="Örn: 75.00"
                    value={formData.yds_score ?? ''}
                    onChange={(e) => handleLanguageScoreChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-1 focus:ring-[#1b4332] focus:outline-none font-mono font-bold text-slate-800"
                  />
                </div>
              </div>

              {/* Seviye Detay Çubuğu */}
              <div className="pt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                <span className="font-semibold text-slate-700">ÖSYM Seviye Eşleşmesi:</span>
                <span className={`px-2 py-0.5 rounded-md border ${formData.yds_level === 'A' ? 'bg-[#1b4332] text-white border-[#1b4332] font-bold' : 'bg-white text-slate-600 border-slate-200'}`}>A (90-100)</span>
                <span className={`px-2 py-0.5 rounded-md border ${formData.yds_level === 'B' ? 'bg-[#1b4332] text-white border-[#1b4332] font-bold' : 'bg-white text-slate-600 border-slate-200'}`}>B (80-89)</span>
                <span className={`px-2 py-0.5 rounded-md border ${formData.yds_level === 'C' ? 'bg-[#1b4332] text-white border-[#1b4332] font-bold' : 'bg-white text-slate-600 border-slate-200'}`}>C (70-79)</span>
                <span className={`px-2 py-0.5 rounded-md border ${formData.yds_level === 'D' ? 'bg-[#1b4332] text-white border-[#1b4332] font-bold' : 'bg-white text-slate-600 border-slate-200'}`}>D (60-69)</span>
                <span className={`px-2 py-0.5 rounded-md border ${formData.yds_level === 'E' ? 'bg-[#1b4332] text-white border-[#1b4332] font-bold' : 'bg-white text-slate-600 border-slate-200'}`}>E (50-59)</span>
                <span className={`px-2 py-0.5 rounded-md border ${formData.yds_level === 'YOK' ? 'bg-slate-200 text-slate-700 border-slate-300 font-bold' : 'bg-white text-slate-400 border-slate-200'}`}>Puan Yok (&lt;50)</span>
              </div>
            </div>
          </div>

          {/* 3. ÖZEL STATÜ BÖLÜMÜ (Kullanıcının İstediği Birebir Tasarım) */}
          <div className="bg-white p-6 rounded-2xl border border-[#e5dfd5] shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                <span>Özel statü</span>
                <span className="text-sm font-normal text-slate-400">· varsa</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Özel statü kontenjanı bulunan kamu ve İŞKUR ilanlarını anında tespit edebilmemiz için varsa durumunuzu işaretleyin:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
              {SPECIAL_STATUS_OPTIONS.map((item) => {
                const isSelected = (formData.special_statuses || []).includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSpecialStatusToggle(item.id)}
                    className={`flex items-start gap-3.5 p-4 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'border-[#1b4332] bg-emerald-50/60 shadow-sm ring-1 ring-[#1b4332]'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="mt-0.5">
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                        isSelected 
                          ? 'bg-[#1b4332] border-[#1b4332] text-white' 
                          : 'border-slate-300 bg-white'
                      }`}>
                        {isSelected && (
                          <svg className="w-3.5 h-3.5 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {item.label}
                      </div>
                      {item.sub && (
                        <div className="text-xs text-slate-400 font-normal mt-0.5">
                          {item.sub}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. KİŞİSEL BİLGİLER VE YAŞ (YAŞ SINIRI ŞARTLARI İÇİN) */}
          <div className="bg-white p-6 rounded-2xl border border-[#e5dfd5] shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#1b4332]" />
                <span>4. Kişisel Bilgiler ve Yaş Durumu</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Kamu alımlarında 30 veya 35 yaş sınırı şartı bulunduğu için doğum tarihiniz önemlidir.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Adınız Soyadınız
                </label>
                <input
                  type="text"
                  placeholder="Adınız Soyadınız"
                  value={formData.full_name || ''}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:ring-1 focus:ring-[#1b4332] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  E-Posta Adresi {isLoggedIn && <span className="text-emerald-600 font-bold">(Kayıtlı)</span>}
                </label>
                <input
                  type="email"
                  placeholder="iletisim@mail.com"
                  value={formData.email || (isLoggedIn ? userEmail || '' : '')}
                  disabled={isLoggedIn}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full px-3 py-2 text-xs rounded-lg border focus:ring-1 focus:ring-[#1b4332] focus:outline-none ${
                    isLoggedIn ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed' : 'border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Doğum Tarihiniz {calculatedAge !== null ? `(${calculatedAge} Yaş)` : ''}
                </label>
                <input
                  type="date"
                  value={formData.birth_date || ''}
                  onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:ring-1 focus:ring-[#1b4332] focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Cinsiyet
                </label>
                <select
                  value={formData.gender || 'BELIRTILMEMIS'}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:ring-1 focus:ring-[#1b4332] focus:outline-none bg-white"
                >
                  <option value="BELIRTILMEMIS">Belirtmek İstemiyorum</option>
                  <option value="ERKEK">Erkek</option>
                  <option value="KADIN">Kadın</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  İkamet Ettiğiniz İl (Öncelikli İlanlar İçin)
                </label>
                <select
                  value={formData.residence_city || ''}
                  onChange={(e) => setFormData({ ...formData, residence_city: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:ring-1 focus:ring-[#1b4332] focus:outline-none bg-white"
                >
                  <option value="">İl Seçiniz</option>
                  {CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Askerlik Durumu (Erkek Adaylar İçin)
                </label>
                <select
                  value={formData.military_status || 'YOK'}
                  onChange={(e) => setFormData({ ...formData, military_status: e.target.value as MilitaryStatus })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:ring-1 focus:ring-[#1b4332] focus:outline-none bg-white"
                >
                  <option value="YOK">İlgisiz / Kadın Aday</option>
                  <option value="YAPILDI">Yapıldı / Terhis</option>
                  <option value="TECİLLİ">Tecilli (Ertelemeli)</option>
                  <option value="MUAFIYET">Muaf</option>
                </select>
              </div>
            </div>

            {/* Boy ve Kilo (Fiziksel Şartlar) */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Fiziksel Özellikler (Boy & Kilo Şartlı İlanlar İçin)
                </span>
                <span className="text-[11px] text-slate-500">Opsiyonel</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Boyunuz (cm)</span>
                    <span className="text-[10px] text-slate-400 font-normal">İtfaiye, Polis, Zabıta</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="140"
                      max="220"
                      placeholder="Örn: 178"
                      value={formData.height ?? ''}
                      onChange={(e) => setFormData({ ...formData, height: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:ring-1 focus:ring-[#1b4332] focus:outline-none font-bold text-slate-800"
                    />
                    <span className="absolute right-3 top-2 text-xs font-semibold text-slate-400">cm</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Kilonuz (kg)</span>
                    <span className="text-[10px] text-slate-400 font-normal">Boy-Kilo Endeksi</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="35"
                      max="160"
                      placeholder="Örn: 75"
                      value={formData.weight ?? ''}
                      onChange={(e) => setFormData({ ...formData, weight: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:ring-1 focus:ring-[#1b4332] focus:outline-none font-bold text-slate-800"
                    />
                    <span className="absolute right-3 top-2 text-xs font-semibold text-slate-400">kg</span>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                💡 <strong>Bilgi:</strong> İtfaiye Eri, Zabıta, Polis, Gümrük Muhafaza ve İnfaz Koruma alımlarında erkeklerde 167 cm / kadınlarda 160 cm asgari boy şartı aranmaktadır. Boyunuzu girdiğinizde sistem bu ilanlardaki boy şartını profilinizle otomatik denetler.
              </p>
            </div>
          </div>

          {/* 5. EK BELGELER & BİLGİSAYAR DERSİ TRANSKRİPT ONAYI */}
          <div className="bg-white p-6 rounded-2xl border border-[#e5dfd5] shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#1b4332]" />
                <span>5. Ek Belgeler & Sertifikalarınız</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                İlanlardaki özel sertifika, ehliyet veya ustalık şartlarıyla tam eşleşmek için sahip olduklarınızı işaretleyin:
              </p>
            </div>

            {/* Bilgisayar Dersi Özel Vurgu Kartı */}
            <div 
              onClick={() => setFormData({ ...formData, has_computer_course: !formData.has_computer_course })}
              className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3.5 ${
                formData.has_computer_course
                  ? 'border-[#1b4332] bg-emerald-50/70 shadow-sm ring-1 ring-[#1b4332]'
                  : 'border-amber-200 bg-amber-50/40 hover:border-amber-300'
              }`}
            >
              <div className="mt-0.5">
                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                  formData.has_computer_course 
                    ? 'bg-[#1b4332] border-[#1b4332] text-white' 
                    : 'border-amber-400 bg-white'
                }`}>
                  {formData.has_computer_course && (
                    <svg className="w-3.5 h-3.5 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <span>💻 Okulda zorunlu veya seçmeli bilgisayar dersi aldım (Transkript Onaylı)</span>
                  <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">Kamuda Geçerli</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Lise veya üniversite öğreniminiz süresince bilgisayar dersi aldıysanız ve transkriptinizde görünüyorsa, kamu alımlarında talep edilen <strong>"MEB Onaylı Bilgisayar İşletmenliği Sertifikası"</strong> şartını resmi olarak sağlamış sayılırsınız.
                </p>
              </div>
            </div>

            {/* Mesleki Belgeler ve Ehliyetler */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Sahip Olduğunuz Diğer Belgeler, Ustalık ve Ehliyetler:
              </label>
              <div className="flex flex-wrap gap-2">
                {CERTIFICATE_OPTIONS.map((cert) => {
                  const isChecked = (formData.certificates || []).includes(cert);
                  return (
                    <button
                      type="button"
                      key={cert}
                      onClick={() => handleCertificateToggle(cert)}
                      className={`text-xs px-3.5 py-2 rounded-xl border transition-all ${
                        isChecked
                          ? 'bg-[#1b4332] text-white border-[#1b4332] font-bold shadow-sm scale-105'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {isChecked ? '✓ ' : '+ '}
                      {cert}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 6. TECRÜBE VE MESLEKİ DENEYİM BÖLÜMÜ */}
          <div className="bg-white p-6 rounded-2xl border border-[#e5dfd5] shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#1b4332]" />
                <span>6. Mesleki Tecrübe ve Çalışma Deneyimi</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Bazı kamu ve banka ilanlarında 1 yıl, 2 yıl veya 3 yıl mesleki deneyim şartı aranmaktadır. Varsa deneyiminizi girin:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Meslek / Deneyim Alanınız
                </label>
                <input
                  type="text"
                  placeholder="Örn: Büro Memuru, Aşçı, Yazılım Geliştirici, Şoför, Güvenlik..."
                  value={formData.experience_field || ''}
                  onChange={(e) => setFormData({ ...formData, experience_field: e.target.value })}
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:ring-1 focus:ring-[#1b4332] focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tecrübe Süreniz (Yıl)
                </label>
                <select
                  value={formData.experience_years ?? 0}
                  onChange={(e) => setFormData({ ...formData, experience_years: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:ring-1 focus:ring-[#1b4332] focus:outline-none bg-white font-medium"
                >
                  <option value={0}>Tecrübem Yok (Yeni Mezun / Deneyimsiz)</option>
                  <option value={1}>1 Yıl Deneyim</option>
                  <option value={2}>2 Yıl Deneyim</option>
                  <option value={3}>3 Yıl Deneyim</option>
                  <option value={4}>4 Yıl Deneyim</option>
                  <option value={5}>5 Yıl ve Üzeri Deneyim</option>
                </select>
              </div>
            </div>

            {/* SGK Hizmet Dökümü Onay Kutusu */}
            <div 
              onClick={() => setFormData({ ...formData, has_sgk_service: !formData.has_sgk_service })}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                formData.has_sgk_service
                  ? 'border-[#1b4332] bg-emerald-50/70 text-slate-900 ring-1 ring-[#1b4332]'
                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                formData.has_sgk_service ? 'bg-[#1b4332] border-[#1b4332] text-white' : 'border-slate-300 bg-white'
              }`}>
                {formData.has_sgk_service && (
                  <svg className="w-3 h-3 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                )}
              </div>
              <span className="text-xs font-semibold">
                Çalışma sürem SGK Hizmet Dökümü veya ilgili kurumdan alınacak resmi belgeyle kanıtlanabilir.
              </span>
            </div>
          </div>

          {/* KAYDET VE SIFIRLA AKSİYON BARI */}
          <div className="sticky bottom-4 z-40 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-[#e5dfd5] shadow-xl flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                if (confirm('Kriterlerinizi temizlemek istediğinize emin misiniz?')) {
                  resetProfile();
                  setFormData({
                    education_level: 'LISANS',
                    graduation_status: 'MEZUN',
                    kpss_type: 'KPSSP3',
                    certificates: [],
                    special_statuses: [],
                    has_computer_course: false,
                    experience_field: '',
                    experience_years: 0,
                    has_sgk_service: false,
                    additional_educations: [],
                    yds_level: 'YOK',
                    yds_score: undefined,
                  });
                  setDepartmentSearch('');
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-500 hover:text-rose-600 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Kriterleri Sıfırla</span>
            </button>

            <button
              type="submit"
              className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-[#1b4332] hover:bg-[#2d6a4f] text-white text-xs font-bold shadow-md shadow-emerald-950/20 transition-all hover:scale-105"
            >
              <Save className="w-4 h-4 text-emerald-300" />
              <span>Bilgilerimi Kaydet ve İlanları Eşle</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
