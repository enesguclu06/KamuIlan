'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  UserCheck, 
  GraduationCap, 
  Award, 
  Send, 
  CheckCircle2, 
  Save, 
  Sparkles, 
  Info, 
  HelpCircle, 
  ShieldCheck, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import { useUserProfile } from '@/lib/context/user-profile-context';
import { UserProfile, EducationLevel, KpssType, YdsLevel, GraduationStatus } from '@/types';
import { POPULAR_DEPARTMENTS } from '@/lib/sample-data';

const CERTIFICATE_OPTIONS = [
  'B Sınıfı Ehliyet',
  'C Sınıfı Ehliyet',
  'D Sınıfı Ehliyet',
  'Silahsız Özel Güvenlik Kartı',
  'Silahlı Özel Güvenlik Kartı',
  'MEB Onaylı Bilgisayar İşletmenliği Sertifikası',
  'Zabıt Katipliği Klavye Sertifikası',
  'Aşçılık Ustalık Belgesi',
  'SRC 2 / SRC 4 Belgesi',
  'İlk Yardım Sertifikası',
  'Hijyen Eğitimi Belgesi',
  'İş Güvenliği Uzmanlığı Belgesi'
];

export default function ProfilePage() {
  const { profile, updateProfile, isLoggedIn, userEmail } = useUserProfile();

  const [formData, setFormData] = useState<UserProfile>({
    full_name: '',
    birth_date: '1998-05-15',
    gender: 'BELIRTILMEMIS',
    education_level: 'LISANS',
    department: 'Bilgisayar Mühendisliği',
    graduation_status: 'MEZUN',
    expected_graduation_date: '',
    kpss_type: 'KPSSP3',
    kpss_score: 75.0,
    yds_level: 'YOK',
    certificates: ['B Sınıfı Ehliyet'],
    preferred_cities: [],
    telegram_chat_id: '',
    notify_enabled: true,
  });

  const [departmentSearch, setDepartmentSearch] = useState('');
  const [departmentSuggestions, setDepartmentSuggestions] = useState<string[]>([]);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [telegramStatusMsg, setTelegramStatusMsg] = useState<{ text: string; success: boolean } | null>(null);

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
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleTestTelegram = async () => {
    if (!formData.telegram_chat_id) {
      setTelegramStatusMsg({ text: 'Lütfen önce Telegram Chat ID giriniz.', success: false });
      return;
    }
    setTestingTelegram(true);
    setTelegramStatusMsg(null);

    try {
      const res = await fetch('/api/test-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: formData.telegram_chat_id,
          userName: formData.full_name,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setTelegramStatusMsg({ text: data.message, success: true });
      } else {
        setTelegramStatusMsg({ text: data.error, success: false });
      }
    } catch (e: any) {
      setTelegramStatusMsg({ text: 'Sunucuya bağlanılamadı.', success: false });
    } finally {
      setTestingTelegram(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Başlık Banner */}
      <div className="bg-gradient-to-r from-sky-900 to-indigo-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-sky-200 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Kişiselleştirilmiş Eşleştirme Motoru</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black">
          Aday Profil ve Kriter Sihirbazı
        </h1>
        <p className="text-sm text-slate-200 max-w-xl">
          Bilgilerinizi 1 dakikada eksiksiz girin. Sistem size uyan kamu kadrolarını anında yeşil rozetle öne çıkarsın ve Telegram ile bildirsin.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-sm font-bold flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>Profil kriterleriniz başarıyla kaydedildi! İlanlar bu kriterlere göre otomatik filtrelenecektir.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        
        {/* 1. KİŞİSEL BİLGİLER */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <UserCheck className="w-5 h-5 text-sky-600" />
            <span>1. Temel Kişisel Bilgiler</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Ad Soyad (Opsiyonel)</label>
              <input
                type="text"
                placeholder="Örn: Ahmet Yılmaz"
                value={formData.full_name || ''}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Doğum Tarihi (Yaş Sınırı İçin)</label>
              <input
                type="date"
                value={formData.birth_date || ''}
                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Cinsiyet</label>
              <select
                value={formData.gender || 'BELIRTILMEMIS'}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white"
              >
                <option value="BELIRTILMEMIS">Belirtmek İstemiyorum</option>
                <option value="ERKEK">Erkek</option>
                <option value="KADIN">Kadın</option>
              </select>
            </div>
          </div>
        </div>

        {/* 2. EĞİTİM VE YÖK BÖLÜM BİLGİLERİ */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <GraduationCap className="w-5 h-5 text-sky-600" />
            <span>2. Eğitim ve YÖK Bölüm Bilgisi</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Eğitim Seviyeniz</label>
              <select
                value={formData.education_level || 'LISANS'}
                onChange={(e) => {
                  const val = e.target.value as EducationLevel;
                  const kpssDefault = val === 'LISANS' ? 'KPSSP3' : (val === 'ONLISANS' ? 'KPSSP93' : 'KPSSP94');
                  setFormData({ ...formData, education_level: val, kpss_type: kpssDefault });
                }}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white font-semibold text-slate-800"
              >
                <option value="LISANS">Lisans (4 Yıllık Fakülte)</option>
                <option value="ONLISANS">Önlisans (2 Yıllık MYO)</option>
                <option value="LISE">Ortaöğretim / Lise / İmam Hatip</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mezuniyet Durumu</label>
              <select
                value={formData.graduation_status || 'MEZUN'}
                onChange={(e) => setFormData({ ...formData, graduation_status: e.target.value as GraduationStatus })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white"
              >
                <option value="MEZUN">Mezun (Diplomam Var)</option>
                <option value="OGRENCI">Halen Öğrenciyim</option>
              </select>
            </div>
          </div>

          {/* Bölüm Arama ve Otomatik Tamamlama */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mezun Olunan Bölüm / Alan (YÖK Standart Sözlüğü)
            </label>
            <input
              type="text"
              placeholder="Bölümünüzü yazmaya başlayın (örn: Bilgisayar Mühendisliği, Hukuk, Tıbbi Sekreterlik)..."
              value={departmentSearch}
              onChange={(e) => {
                setDepartmentSearch(e.target.value);
                setFormData({ ...formData, department: e.target.value });
              }}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium"
            />

            {/* Öneri Rozetleri */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="text-[11px] text-slate-400 py-0.5">Önerilenler:</span>
              {departmentSuggestions.map((dept) => (
                <button
                  type="button"
                  key={dept}
                  onClick={() => {
                    setDepartmentSearch(dept);
                    setFormData({ ...formData, department: dept });
                  }}
                  className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                    formData.department === dept
                      ? 'bg-sky-600 text-white border-sky-600 font-bold'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 3. KPSS VE DİL (YDS) PUANLARI */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Award className="w-5 h-5 text-sky-600" />
            <span>3. KPSS ve YDS Sınav Bilgileri</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">KPSS Puan Türü</label>
              <select
                value={formData.kpss_type || 'KPSSP3'}
                onChange={(e) => setFormData({ ...formData, kpss_type: e.target.value as KpssType })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white font-medium"
              >
                <option value="KPSSP3">KPSSP3 (Lisans)</option>
                <option value="KPSSP93">KPSSP93 (Önlisans)</option>
                <option value="KPSSP94">KPSSP94 (Ortaöğretim / Lise)</option>
                <option value="KPSS_YOK">KPSS Puanım Yok (Sadece KPSS Şartsızlar)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">KPSS Puanınız</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="Örn: 78.45"
                value={formData.kpss_score || ''}
                onChange={(e) => setFormData({ ...formData, kpss_score: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">YDS / Denk Dil Düzeyi</label>
              <select
                value={formData.yds_level || 'YOK'}
                onChange={(e) => setFormData({ ...formData, yds_level: e.target.value as YdsLevel })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white"
              >
                <option value="YOK">YDS Yok / Belirtilmedi</option>
                <option value="E">E Düzeyi (50 - 59 Puan)</option>
                <option value="D">D Düzeyi (60 - 69 Puan)</option>
                <option value="C">C Düzeyi (70 - 79 Puan)</option>
                <option value="B">B Düzeyi (80 - 89 Puan)</option>
                <option value="A">A Düzeyi (90 - 100 Puan)</option>
              </select>
            </div>
          </div>
        </div>

        {/* 4. SAHİP OLUNAN SERTİFİKALAR VE EHLİYETLER */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <ShieldCheck className="w-5 h-5 text-sky-600" />
            <span>4. Sertifika, Ehliyet ve Özel Nitelikler</span>
          </h2>
          <p className="text-xs text-slate-500">
            İlanlardaki "B Sınıfı Ehliyet", "Özel Güvenlik Kartı" gibi özel şartlarla otomatik eşleşmek için sahip olduklarınızı işaretleyin:
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            {CERTIFICATE_OPTIONS.map((cert) => {
              const isChecked = (formData.certificates || []).includes(cert);
              return (
                <button
                  type="button"
                  key={cert}
                  onClick={() => handleCertificateToggle(cert)}
                  className={`text-xs px-3 py-1.5 rounded-xl border transition-all ${
                    isChecked
                      ? 'bg-sky-600 text-white border-sky-600 font-bold shadow-sm'
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

        {/* 5. TELEGRAM ANLIK BİLDİRİM ENTEGRASYONU */}
        <div className="bg-gradient-to-tr from-sky-500/10 via-white to-sky-500/5 p-6 rounded-2xl border border-sky-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Send className="w-5 h-5 text-sky-600" />
              <span>5. Telegram Anlık Bildirim Kurulumu (%100 Ücretsiz)</span>
            </h2>
            <span className="text-[11px] font-extrabold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
              Sınırsız Bildirim
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-sky-100 text-xs text-slate-700 space-y-2">
            <p className="font-bold text-slate-900">Telegram Bildirimlerini Açmak İçin 3 Kolay Adım:</p>
            <ol className="list-decimal list-inside space-y-1 text-slate-600">
              <li>Telegram uygulamasında botu açın: <strong className="text-sky-600">@KamuIlanRobotu</strong></li>
              <li>Bota <strong>/start</strong> mesajını gönderin. Bot size özel sayısal <strong>Chat ID</strong>'nizi yanıtlayacaktır.</li>
              <li>Aşağıdaki kutucuğa Chat ID'nizi yapıştırıp <strong>Test Bildirimi Gönder</strong> butonuna tıklayın.</li>
            </ol>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-8">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Telegram Chat ID'niz
              </label>
              <input
                type="text"
                placeholder="Örn: 987654321"
                value={formData.telegram_chat_id || ''}
                onChange={(e) => setFormData({ ...formData, telegram_chat_id: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-none font-mono"
              />
            </div>

            <div className="sm:col-span-4">
              <button
                type="button"
                onClick={handleTestTelegram}
                disabled={testingTelegram}
                className="w-full px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors disabled:opacity-50"
              >
                {testingTelegram ? 'Gönderiliyor...' : 'Test Bildirimi Gönder'}
              </button>
            </div>
          </div>

          {telegramStatusMsg && (
            <div
              className={`p-3 rounded-lg text-xs font-semibold ${
                telegramStatusMsg.success
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {telegramStatusMsg.text}
            </div>
          )}
        </div>

        {/* KAYDET AKSİYON ÇUBUĞU */}
        <div className="sticky bottom-4 z-40 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-300 shadow-xl flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {isLoggedIn ? (
              <span>Giriş yapıldı: <strong>{userEmail}</strong> (Buluta senkronize ediliyor)</span>
            ) : (
              <span>Giriş yapılmadı (Kriterler tarayıcınızda güvenle saklanır)</span>
            )}
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold shadow-md shadow-sky-600/30 transition-all hover:scale-105"
          >
            <Save className="w-4 h-4" />
            <span>Kriterleri Kaydet ve Eşleştir</span>
          </button>
        </div>
      </form>
    </div>
  );
}
