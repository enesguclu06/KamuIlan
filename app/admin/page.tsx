'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  Sparkles, 
  FileText, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Upload, 
  Database,
  ArrowRight,
  Eye,
  Plus,
  Trash2
} from 'lucide-react';
import { Announcement, Position } from '@/types';

export default function AdminPage() {
  const [rawText, setRawText] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
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
            : `Başarılı! İlan kaydedildi ve ${json.notifiedUsers || 0} adaya anlık bildirim iletildi.`
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

  const loadSampleText = () => {
    setRawText(`
T.C. İÇİŞLERİ BAKANLIĞI SÖZLEŞMELİ BİLİŞİM PERSONELİ ALIM İLANI
Bakanlığımız Bilgi Teknolojileri Genel Müdürlüğü emrinde istihdam edilmek üzere; 375 sayılı Kanun Hükmünde Kararname'nin Ek 6 ncı maddesi uyarınca 15 (on beş) Sözleşmeli Bilişim Personeli alınacaktır.

BAŞVURU ŞARTLARI:
1. Fakültelerin 4 yıllık Bilgisayar Mühendisliği, Yazılım Mühendisliği, Elektrik-Elektronik Mühendisliği bölümlerinden mezun olmak.
2. 2024 KPSSP3 puan türünden en az 70 puan almış olmak.
3. YDS'den en az D düzeyinde İngilizce dil puanına sahip olmak.
4. Başvuru yapacak adayların 35 yaşını doldurmamış olması gerekmektedir.
5. Son başvuru tarihi: 15 Aralık 2026 saat 23:59.
6. Başvurular e-Devlet Kapısı üzerinden Kariyer Kapısı Kamu İşe Alım platformundan yapılacaktır.
`.trim());
    setSourceUrl('https://www.resmigazete.gov.tr/ilanlar/eskiilanlar/2026/12/ornek-ilan.htm');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Başlık */}
      <div className="bg-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Yönetim ve Manuel İlan Girişi</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black">
          Yapay Zeka Destekli İlan Ayrıştırıcı
        </h1>
        <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
          Resmî Gazete veya kurum web sitesinden kopyaladığınız ham metni yapıştırın. Google Gemini AI modeli şartları, kadroları, KPSS ve bölümleri otomatik olarak yapılandırılmış JSON standardına dönüştürsün.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs sm:text-sm font-semibold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs sm:text-sm font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Metin Giriş Alanı */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-600" />
            <span>Ham İlan Metni veya PDF İçeriği</span>
          </h2>
          <button
            type="button"
            onClick={loadSampleText}
            className="text-xs font-bold text-sky-600 hover:text-sky-700 underline"
          >
            Örnek İlan Metni Doldur
          </button>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            İlanın Kaynak Linki (Opsiyonel)
          </label>
          <input
            type="url"
            placeholder="https://www.resmigazete.gov.tr/ilanlar/..."
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            İlan Metni (Tüm Başvuru Şartları, Kadrolar ve Kontenjanlar)
          </label>
          <textarea
            rows={10}
            placeholder="Buraya Resmî Gazete veya kurumun ilan metnini yapıştırın..."
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            className="w-full p-3 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-none font-mono text-xs leading-relaxed"
          />
        </div>

        <button
          type="button"
          onClick={handleParseWithGemini}
          disabled={parsing}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white text-sm font-bold shadow-md shadow-sky-600/20 transition-all disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          <span>{parsing ? 'Gemini AI Analiz Ediyor...' : 'Gemini AI ile Ayrıştır'}</span>
        </button>
      </div>

      {/* AYRIŞTIRMA SONUCU VE ÖNİZLEME */}
      {parsedData && (
        <div className="bg-white p-6 rounded-2xl border border-sky-300 shadow-md space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-extrabold text-emerald-600 uppercase tracking-wider">
                Yapay Zeka Analiz Sonucu
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                {parsedData.institution}
              </h3>
            </div>
            <button
              type="button"
              onClick={handleSaveToDatabase}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
            >
              <Database className="w-4 h-4" />
              <span>{saving ? 'Kaydediliyor & Bildiriliyor...' : 'Supabase\'e Kaydet ve Bildirim Dağıt'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-bold text-slate-400">İlan Başlığı:</span>
              <p className="font-semibold text-slate-800 mt-1">{parsedData.title}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-bold text-slate-400">Son Başvuru Tarihi:</span>
              <p className="font-semibold text-slate-800 mt-1">{parsedData.deadline}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-bold text-slate-400">Başvuru Yöntemi:</span>
              <p className="font-semibold text-slate-800 mt-1">{parsedData.application_method}</p>
            </div>
          </div>

          {/* Kadrolar Tablosu */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase">
              Yakalanan Kadrolar ({parsedData.positions.length} Pozisyon):
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold">
                  <tr>
                    <th className="p-3">Kadro Ünvanı</th>
                    <th className="p-3">Kontenjan</th>
                    <th className="p-3">Eğitim</th>
                    <th className="p-3">KPSS Şartı</th>
                    <th className="p-3">Bölümler</th>
                    <th className="p-3">Yaş Sınırı</th>
                    <th className="p-3">Sınav Türü</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {parsedData.positions.map((pos, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{pos.title}</td>
                      <td className="p-3 font-mono font-bold text-sky-600">{pos.quota}</td>
                      <td className="p-3">{pos.education_level}</td>
                      <td className="p-3 font-mono">{pos.kpss_type} (≥{pos.min_kpss_score})</td>
                      <td className="p-3 max-w-[200px] truncate" title={pos.allowed_departments.join(', ')}>
                        {pos.is_any_department ? 'Tüm Bölümler' : pos.allowed_departments.join(', ') || 'Belirtilmedi'}
                      </td>
                      <td className="p-3">{pos.max_age || 'Yok'}</td>
                      <td className="p-3">{pos.exam_type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
