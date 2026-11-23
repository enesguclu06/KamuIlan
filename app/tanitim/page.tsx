import React from 'react';
import Link from 'next/link';
import { 
  Building2, 
  CheckCircle2, 
  SlidersHorizontal, 
  ArrowRight, 
  ShieldCheck, 
  Compass, 
  GraduationCap, 
  Clock, 
  MapPin, 
  Users, 
  FileText,
  Star,
  Check
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="bg-[#faf8f5] min-h-screen text-slate-800 space-y-16 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        {/* HERO SECTION */}
        <div className="text-center space-y-6 max-w-3xl mx-auto pt-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100 text-[#1b4332] text-xs font-bold border border-emerald-200">
            <Building2 className="w-4 h-4" />
            <span>Türkiye'nin En Kapsamlı Kamu İlan Portalı</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-[#1b4332] tracking-tight leading-tight">
            Kamudaki Tüm Memur ve Personel Alımları Tek Ekranda
          </h1>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            Resmî Gazete Çeşitli İlanlar ve Cumhurbaşkanlığı Kariyer Kapısı alımlarını her sabah otomatik tarayın. Mezuniyet bölümünüzü, KPSS ve ALES puanınızı girerek sadece <strong>başvurabileceğiniz kadroları</strong> saniyeler içinde bulun.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/giris"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-[#1b4332] hover:bg-[#2d6a4f] text-white text-base font-bold shadow-xl shadow-emerald-950/20 transition-all hover:scale-105"
            >
              <span>Ücretsiz Kayıt Ol & Başla</span>
              <ArrowRight className="w-5 h-5" />
            </Link>

            <Link
              href="/"
              className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-800 text-base font-bold border border-[#e5dfd5] transition-all shadow-sm"
            >
              <Compass className="w-5 h-5 text-[#2d6a4f]" />
              <span>Açık İlanları İncele</span>
            </Link>
          </div>

          <p className="text-xs text-slate-400 font-medium">
            Kredi kartı gerekmez • %100 Ücretsiz Açık Kamu Hizmeti
          </p>
        </div>

        {/* 3 BÜYÜK İSTATİSTİK ŞERİDİ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#1b4332] text-white p-6 rounded-2xl shadow-md space-y-1">
            <span className="text-3xl sm:text-4xl font-black font-mono">246+</span>
            <p className="font-bold text-sm text-emerald-200">Aktif Kamu İlanı</p>
            <p className="text-xs text-emerald-100/70">Bakanlıklar, Üniversiteler, Belediyeler</p>
          </div>

          <div className="bg-white border border-[#e5dfd5] text-slate-900 p-6 rounded-2xl shadow-sm space-y-1">
            <span className="text-3xl sm:text-4xl font-black font-mono text-[#2d6a4f]">1.735+</span>
            <p className="font-bold text-sm text-slate-800">Açık Kadro ve Kontenjan</p>
            <p className="text-xs text-slate-500">Mühendis, Avukat, Katip, Hemşire, Memur</p>
          </div>

          <div className="bg-white border border-[#e5dfd5] text-slate-900 p-6 rounded-2xl shadow-sm space-y-1">
            <span className="text-3xl sm:text-4xl font-black font-mono text-[#2d6a4f]">173+</span>
            <p className="font-bold text-sm text-slate-800">Kamu Kurumu ve Belediye</p>
            <p className="text-xs text-slate-500">81 il genelinde anlık alım takibi</p>
          </div>
        </div>

        {/* NASIL ÇALIŞIR? 3 ADIM */}
        <div className="bg-white border border-[#e5dfd5] p-8 sm:p-12 rounded-3xl shadow-sm space-y-10">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-black text-[#1b4332]">
              Kamu İlan Nasıl Çalışır?
            </h2>
            <p className="text-sm text-slate-500">
              Yüzlerce sayfalık karmaşık PDF şartnamelerini okuma devri bitti.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-[#1b4332] flex items-center justify-center font-black text-lg">
                1
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Her Gün Resmî Gazete Taranır
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Her sabah yayımlanan Resmî Gazete Çeşitli İlanlar sayfası otomatik olarak taranır; üniversite, bakanlık ve belediye alımları sisteme anında aktarılır.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-[#1b4332] flex items-center justify-center font-black text-lg">
                2
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Kriterlerinizle Akıllıca Eşleşir
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Bölümünüz, eğitim seviyeniz, KPSS/ALES puanınız ve yaş sınırınız kadrolarla deterministik olarak karşılaştırılır. Uygun kadrolar yeşil rozetle önünüze gelir.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-[#1b4332] flex items-center justify-center font-black text-lg">
                3
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Doğrudan Başvuru Ekranına Git
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Kariyer Kapısı, e-Devlet ve ÖSYM tercih sistemlerine tek tıkla yönlendirilir, son başvuru tarihini kaçırmadan başvurunuzu tamamlarsınız.
              </p>
            </div>
          </div>
        </div>

        {/* TÜM BÖLÜMLER İÇİN KAPSAMA ALANI */}
        <div className="space-y-6">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-black text-[#1b4332]">
              Hangi Bölümler İçin İlan Var?
            </h2>
            <p className="text-sm text-slate-500">
              Türkiye'deki tüm lise, önlisans ve lisans alanları desteklenir.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-semibold">
            {[
              '⚖️ Hukuk & Adalet',
              '💻 Bilgisayar & Yazılım Müh.',
              '🏗️ İnşaat & Mimarlık',
              '📈 İktisat & İşletme & Maliye',
              '🏥 Hemşirelik & Sağlık',
              '⚡ Elektrik-Elektronik',
              '🚜 Ziraat & Veterinerlik',
              '📋 Büro & Sekreterlik',
              '🛡️ Güvenlik & Zabıta',
              '🚒 İtfaiye & Şoförlük',
              '🎓 Akademik & Araştırma Gör.',
              '🏢 Tüm Lisans / Lise Programları'
            ].map((item, i) => (
              <div key={i} className="p-3.5 rounded-xl bg-white border border-[#e5dfd5] text-slate-800 flex items-center gap-2 shadow-sm">
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ALT ÇAĞRI (FOOTER CTA) */}
        <div className="bg-[#1b4332] text-white p-8 sm:p-12 rounded-3xl text-center space-y-6 shadow-xl">
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
            Hedefindeki Kamu Görevine Bir Adım Daha Yaklaş
          </h2>
          <p className="text-sm sm:text-base text-emerald-100 max-w-xl mx-auto leading-relaxed">
            Hemen ücretsiz kaydol, bölümünü seç ve sana özel açılan tüm kadroları liste halinde incele.
          </p>
          <div className="pt-2">
            <Link
              href="/giris"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white text-[#1b4332] hover:bg-emerald-50 text-base font-black shadow-lg transition-all hover:scale-105"
            >
              <span>Ücretsiz Hesap Oluştur</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
