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
  RotateCcw
} from 'lucide-react';
import { useUserProfile } from '@/lib/context/user-profile-context';
import { UserProfile, EducationLevel, KpssType, AlesType, YdsLevel, GraduationStatus, MilitaryStatus } from '@/types';
import { POPULAR_DEPARTMENTS, SAMPLE_ANNOUNCEMENTS } from '@/lib/sample-data';
import { computeAnnouncementMatch, calculateAge } from '@/lib/matcher';

const CERTIFICATE_OPTIONS = [
  'B Sınıfı Ehliyet',
  'C Sınıfı Ehliyet',
  'D Sınıfı Ehliyet',
  'Silahsız Özel Güvenlik Kartı',
  'Silahlı Özel Güvenlik Kartı',
  'MEB Onaylı Bilgisayar İşletmenliği Sertifikası',
  'Zabıt Katipliği / Hızlı Klavye Sertifikası',
  'Aşçılık Ustalık / Kalfalık Belgesi',
  'SRC 2 / SRC 4 Belgesi',
  'İlk Yardım Sertifikası',
  'Hijyen Eğitimi Belgesi',
  'İş Sağlığı ve Güvenliği (İSG) Belgesi'
];

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
      setFormData(profile);
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

            {/* Yabancı Dil (YDS / YÖKDİL) */}
            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-3">
              <h3 className="text-xs font-extrabold text-[#1b4332] uppercase tracking-wider flex items-center gap-1.5">
                <span>🌍 Yabancı Dil Bilgisi (YDS / YÖKDİL)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    YDS Düzeyi
                  </label>
                  <select
                    value={formData.yds_level || 'YOK'}
                    onChange={(e) => setFormData({ ...formData, yds_level: e.target.value as YdsLevel })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:ring-1 focus:ring-[#1b4332] focus:outline-none bg-white font-medium"
                  >
                    <option value="YOK">YDS Yok / Belirtilmedi</option>
                    <option value="A">A Düzeyi (90 - 100 Puan)</option>
                    <option value="B">B Düzeyi (80 - 89 Puan)</option>
                    <option value="C">C Düzeyi (70 - 79 Puan)</option>
                    <option value="D">D Düzeyi (60 - 69 Puan)</option>
                    <option value="E">E Düzeyi (50 - 59 Puan)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Yabancı Dil Puanınız (Varsa Sayısal)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="Örn: 70.00"
                    value={formData.yds_score ?? ''}
                    onChange={(e) => setFormData({ ...formData, yds_score: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:ring-1 focus:ring-[#1b4332] focus:outline-none font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. KİŞİSEL BİLGİLER VE YAŞ (YAŞ SINIRI ŞARTLARI İÇİN) */}
          <div className="bg-white p-6 rounded-2xl border border-[#e5dfd5] shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#1b4332]" />
                <span>3. Kişisel Bilgiler ve Yaş Durumu</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Kamu alımlarında 30 veya 35 yaş sınırı şartı bulunduğu için doğum tarihiniz önemlidir.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Adınız Soyadınız (Opsiyonel)
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
          </div>

          {/* 4. SERTİFİKALAR VE EHLİYETLER */}
          <div className="bg-white p-6 rounded-2xl border border-[#e5dfd5] shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#1b4332]" />
                <span>4. Sahip Olduğunuz Belgeler & Ehliyetler</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                İlanlardaki "B Sınıfı Ehliyet", "Özel Güvenlik Kartı" gibi ek şartlarla tam eşleşmek için sahip olduklarınızı işaretleyin:
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
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
