-- ==============================================================================
-- KAMU İLAN TAKİP VE AKILLI EŞLEŞTİRME PLATFORMU - SUPABASE POSTGRESQL ŞEMASI
-- ==============================================================================

-- 0. Gerekli Uzantılar
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 1. YÖK STANDART BÖLÜM SÖZLÜĞÜ (departments)
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    education_level TEXT NOT NULL CHECK (education_level IN ('LISE', 'ONLISANS', 'LISANS')),
    aliases TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. ANA İLANLAR TABLOSU (announcements)
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL CHECK (source IN ('RESMI_GAZETE', 'KARIYER_KAPISI', 'MANUEL')),
    source_url TEXT NOT NULL UNIQUE,
    institution TEXT NOT NULL,
    title TEXT NOT NULL,
    publish_date DATE NOT NULL DEFAULT CURRENT_DATE,
    deadline TIMESTAMPTZ NOT NULL,
    application_method TEXT DEFAULT 'Kariyer Kapısı / e-Devlet',
    raw_summary TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. KADROLAR VE ŞARTLAR TABLOSU (positions)
CREATE TABLE IF NOT EXISTS public.positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    quota INT NOT NULL DEFAULT 1 CHECK (quota >= 1),
    education_level TEXT NOT NULL CHECK (education_level IN ('LISE', 'ONLISANS', 'LISANS')),
    kpss_type TEXT NOT NULL CHECK (kpss_type IN ('KPSSP3', 'KPSSP93', 'KPSSP94', 'KPSS_YOK')),
    min_kpss_score NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (min_kpss_score >= 0 AND min_kpss_score <= 100),
    min_ales_score NUMERIC(5,2) NULL CHECK (min_ales_score IS NULL OR (min_ales_score >= 0 AND min_ales_score <= 100)),
    ales_type TEXT NULL CHECK (ales_type IS NULL OR ales_type IN ('SAYISAL', 'ESIT_AGIRLIK', 'SOZEL')),
    allowed_departments TEXT[] NOT NULL DEFAULT '{}',
    is_any_department BOOLEAN NOT NULL DEFAULT FALSE,
    min_yds_level TEXT NOT NULL DEFAULT 'YOK' CHECK (min_yds_level IN ('YOK', 'E', 'D', 'C', 'B', 'A')),
    min_yds_score NUMERIC(5,2) NULL,
    max_age INT NULL CHECK (max_age IS NULL OR (max_age >= 18 AND max_age <= 70)),
    gender_requirement TEXT NOT NULL DEFAULT 'HEPSI' CHECK (gender_requirement IN ('HEPSI', 'ERKEK', 'KADIN')),
    cities TEXT[] NOT NULL DEFAULT '{"TÜRKİYE GENELİ"}',
    special_conditions TEXT[] NOT NULL DEFAULT '{}',
    exam_type TEXT NOT NULL DEFAULT 'MULAKAT' CHECK (exam_type IN ('MULAKAT', 'KPSS_PUAN_USTUNLUGU', 'UYGULAMALI')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. KULLANICI PROFİLLERİ (user_profiles)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    birth_date DATE,
    gender TEXT DEFAULT 'BELIRTILMEMIS' CHECK (gender IN ('ERKEK', 'KADIN', 'BELIRTILMEMIS')),
    education_level TEXT CHECK (education_level IN ('LISE', 'ONLISANS', 'LISANS')),
    department TEXT,
    graduation_status TEXT NOT NULL DEFAULT 'MEZUN' CHECK (graduation_status IN ('MEZUN', 'OGRENCI')),
    expected_graduation_date DATE,
    kpss_type TEXT CHECK (kpss_type IN ('KPSSP3', 'KPSSP93', 'KPSSP94', 'KPSS_YOK')),
    kpss_score NUMERIC(5,2) DEFAULT 0.00 CHECK (kpss_score >= 0 AND kpss_score <= 100),
    ales_type TEXT NULL CHECK (ales_type IS NULL OR ales_type IN ('SAYISAL', 'ESIT_AGIRLIK', 'SOZEL')),
    ales_score NUMERIC(5,2) NULL CHECK (ales_score IS NULL OR (ales_score >= 0 AND ales_score <= 100)),
    yds_level TEXT NOT NULL DEFAULT 'YOK' CHECK (yds_level IN ('YOK', 'E', 'D', 'C', 'B', 'A')),
    yds_score NUMERIC(5,2) NULL,
    military_status TEXT DEFAULT 'YOK' CHECK (military_status IN ('YAPILDI', 'MUAFIYET', 'TECİLLİ', 'YOK')),
    residence_city TEXT NULL,
    certificates TEXT[] NOT NULL DEFAULT '{}',
    preferred_cities TEXT[] NOT NULL DEFAULT '{}',
    telegram_chat_id TEXT,
    notify_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- İNDEKSLER (PERFORMANS VE HIZLI SORGULAR İÇİN)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_announcements_deadline ON public.announcements(deadline DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON public.announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_institution ON public.announcements(institution);
CREATE INDEX IF NOT EXISTS idx_positions_announcement_id ON public.positions(announcement_id);
CREATE INDEX IF NOT EXISTS idx_positions_education_level ON public.positions(education_level);
CREATE INDEX IF NOT EXISTS idx_positions_kpss_type ON public.positions(kpss_type);
CREATE INDEX IF NOT EXISTS idx_user_profiles_notify ON public.user_profiles(notify_enabled, telegram_chat_id) WHERE telegram_chat_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_departments_name_trgm ON public.departments USING gin (name gin_trgm_ops);

-- ==============================================================================
-- TRİGGER: user_profiles.updated_at OTOMATİK GÜNCELLEME
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER trigger_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLİTİKALARI
-- ==============================================================================
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- departments: Herkes okuyabilir, sadece service_role değiştirebilir
CREATE POLICY "Departments are viewable by everyone" 
    ON public.departments FOR SELECT USING (true);

-- announcements: Herkes okuyabilir (anon + auth)
CREATE POLICY "Announcements are viewable by everyone" 
    ON public.announcements FOR SELECT USING (true);

CREATE POLICY "Service role can manage announcements" 
    ON public.announcements FOR ALL USING (auth.role() = 'service_role');

-- positions: Herkes okuyabilir (anon + auth)
CREATE POLICY "Positions are viewable by everyone" 
    ON public.positions FOR SELECT USING (true);

CREATE POLICY "Service role can manage positions" 
    ON public.positions FOR ALL USING (auth.role() = 'service_role');

-- user_profiles: Kullanıcı sadece kendi profilini görebilir ve yönetebilir
CREATE POLICY "Users can view their own profile" 
    ON public.user_profiles FOR SELECT 
    USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can insert their own profile" 
    ON public.user_profiles FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
    ON public.user_profiles FOR UPDATE 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role has full access to user_profiles" 
    ON public.user_profiles FOR ALL 
    USING (auth.role() = 'service_role');

-- ==============================================================================
-- 100+ STANDART YÖK BÖLÜM SEED VERİSİ (LİSANS, ÖNLİSANS, LİSE)
-- ==============================================================================
INSERT INTO public.departments (name, education_level, aliases) VALUES
-- LİSANS - Bilişim ve Mühendislik
('Bilgisayar Mühendisliği', 'LISANS', ARRAY['Bilgisayar Müh.', 'Bilgisayar Bilimi ve Mühendisliği', 'Computer Engineering']),
('Yazılım Mühendisliği', 'LISANS', ARRAY['Yazılım Müh.', 'Software Engineering']),
('Elektrik-Elektronik Mühendisliği', 'LISANS', ARRAY['Elektrik Elektronik Müh.', 'Elektrik Müh.', 'Elektronik ve Haberleşme Müh.']),
('Makine Mühendisliği', 'LISANS', ARRAY['Makina Mühendisliği', 'Makine Müh.', 'Mechanical Engineering']),
('İnşaat Mühendisliği', 'LISANS', ARRAY['İnşaat Müh.', 'Civil Engineering']),
('Endüstri Mühendisliği', 'LISANS', ARRAY['Endüstri Müh.', 'Industrial Engineering']),
('Çevre Mühendisliği', 'LISANS', ARRAY['Çevre Müh.']),
('Kimya Mühendisliği', 'LISANS', ARRAY['Kimya Müh.', 'Kimya ve Süreç Müh.']),
('Gıda Mühendisliği', 'LISANS', ARRAY['Gıda Müh.']),
('Ziraat Mühendisliği', 'LISANS', ARRAY['Ziraat Müh.', 'Bitki Koruma', 'Tarla Bitkileri', 'Bahçe Bitkileri']),
('Harita Mühendisliği', 'LISANS', ARRAY['Geomatik Mühendisliği', 'Jeodezi ve Fotogrametri Müh.']),
('Maden Mühendisliği', 'LISANS', ARRAY['Maden Müh.']),
('Jeoloji Mühendisliği', 'LISANS', ARRAY['Jeoloji Müh.']),
('Biyomedikal Mühendisliği', 'LISANS', ARRAY['Biyomedikal Müh.']),
('Yapay Zeka ve Veri Mühendisliği', 'LISANS', ARRAY['Yapay Zeka Mühendisliği', 'Veri Mühendisliği']),
('Yönetim Bilişim Sistemleri', 'LISANS', ARRAY['YBS', 'Management Information Systems', 'MIS']),

-- LİSANS - İktisadi ve İdari Bilimler, Hukuk
('Hukuk', 'LISANS', ARRAY['Hukuk Fakültesi', 'Law']),
('İktisat', 'LISANS', ARRAY['Ekonomi', 'Economics']),
('İşletme', 'LISANS', ARRAY['Business Administration', 'İşletmecilik']),
('Maliye', 'LISANS', ARRAY['Kamu Maliyesi']),
('Kamu Yönetimi', 'LISANS', ARRAY['Siyaset Bilimi ve Kamu Yönetimi', 'SBKY']),
('Uluslararası İlişkiler', 'LISANS', ARRAY['Siyaset Bilimi ve Uluslararası İlişkiler']),
('Çalışma Ekonomisi ve Endüstri İlişkileri', 'LISANS', ARRAY['ÇEKO']),
('Ekonometri', 'LISANS', ARRAY['Econometrics']),
('Sağlık Yönetimi', 'LISANS', ARRAY['Sağlık Kurumları Yöneticiliği']),
('Uluslararası Ticaret ve Lojistik', 'LISANS', ARRAY['Uluslararası Lojistik', 'Dış Ticaret ve Lojistik']),

-- LİSANS - Sağlık Bilimleri
('Tıp', 'LISANS', ARRAY['Tıp Fakültesi', 'Tabip']),
('Diş Hekimliği', 'LISANS', ARRAY['Diş Hekimi']),
('Eczacılık', 'LISANS', ARRAY['Eczacı']),
('Hemşirelik', 'LISANS', ARRAY['Hemşire', 'Sağlık Memurluğu']),
('Ebelik', 'LISANS', ARRAY['Ebe']),
('Fizyoterapi ve Rehabilitasyon', 'LISANS', ARRAY['Fizyoterapist', 'Fizik Tedavi']),
('Beslenme ve Diyetetik', 'LISANS', ARRAY['Diyetisyen']),
('Çocuk Gelişimi', 'LISANS', ARRAY['Çocuk Gelişimi ve Eğitimi']),
('Sosyal Hizmet', 'LISANS', ARRAY['Sosyal Hizmetler', 'Sosyal Çalışmacı']),
('Odyoloji', 'LISANS', ARRAY['Odyolog']),
('Veteriner Hekimliği', 'LISANS', ARRAY['Veteriner']),

-- LİSANS - Eğitim ve Öğretmenlik
('Sınıf Öğretmenliği', 'LISANS', ARRAY['Sınıf Öğretmeni']),
('Rehberlik ve Psikolojik Danışmanlık', 'LISANS', ARRAY['PDR', 'Psikolojik Danışman']),
('Okul Öncesi Öğretmenliği', 'LISANS', ARRAY['Okul Öncesi Eğitimi']),
('Özel Eğitim Öğretmenliği', 'LISANS', ARRAY['Özel Eğitim']),
('İngilizce Öğretmenliği', 'LISANS', ARRAY['İngiliz Dili Eğitimi']),
('Türkçe Öğretmenliği', 'LISANS', ARRAY['Türk Dili ve Edebiyatı Öğretmenliği']),
('İlköğretim Matematik Öğretmenliği', 'LISANS', ARRAY['Matematik Öğretmenliği']),
('Beden Eğitimi ve Spor Öğretmenliği', 'LISANS', ARRAY['BESYO']),

-- LİSANS - Fen, Edebiyat ve İlahiyat
('Psikoloji', 'LISANS', ARRAY['Psikolog']),
('Sosyoloji', 'LISANS', ARRAY['Sosyolog']),
('Tarih', 'LISANS', ARRAY['Tarihçi']),
('Türk Dili ve Edebiyatı', 'LISANS', ARRAY['Türkçe ve Edebiyat']),
('Matematik', 'LISANS', ARRAY['Matematikçi']),
('İstatistik', 'LISANS', ARRAY['İstatistikçi']),
('Fizik', 'LISANS', ARRAY['Fizikçi']),
('Kimya', 'LISANS', ARRAY['Kimyager']),
('Biyoloji', 'LISANS', ARRAY['Biyolog', 'Moleküler Biyoloji ve Genetik']),
('İlahiyat', 'LISANS', ARRAY['İslami İlimler', 'Din Kültürü']),
('Mimarlık', 'LISANS', ARRAY['Mimar']),
('Şehir ve Bölge Planlama', 'LISANS', ARRAY['Şehir Plancısı']),

-- ÖNLİSANS - Bilişim, Büro ve Teknik
('Bilgisayar Programcılığı', 'ONLISANS', ARRAY['Bilgisayar Teknolojisi ve Programlama', 'Yazılım']),
('Adalet', 'ONLISANS', ARRAY['Adalet Meslek Yüksekokulu', 'Zabıt Katipliği']),
('Büro Yönetimi ve Yönetici Asistanlığı', 'ONLISANS', ARRAY['Büro Yönetimi', 'Sekreterlik']),
('Tıbbi Dokümantasyon ve Sekreterlik', 'ONLISANS', ARRAY['Tıbbi Sekreterlik', 'Sağlık İdaresi']),
('Muhasebe ve Vergi Uygulamaları', 'ONLISANS', ARRAY['Muhasebe', 'Bilgisayarlı Muhasebe']),
('İnsan Kaynakları Yönetimi', 'ONLISANS', ARRAY['İnsan Kaynakları']),
('Halkla İlişkiler ve Tanıtım', 'ONLISANS', ARRAY['Halkla İlişkiler']),
('Sosyal Güvenlik', 'ONLISANS', ARRAY['SGK']),
('Dış Ticaret', 'ONLISANS', ARRAY['Gümrük']),
('Lojistik', 'ONLISANS', ARRAY['Taşımacılık ve Lojistik']),
('Bankacılık ve Sigortacılık', 'ONLISANS', ARRAY['Bankacılık']),

-- ÖNLİSANS - Sağlık Hizmetleri
('İlk ve Acil Yardım', 'ONLISANS', ARRAY['Paramedik', 'Acil Tıp Teknikeri']),
('Anestezi', 'ONLISANS', ARRAY['Anestezi Teknikeri']),
('Tıbbi Laboratuvar Teknikleri', 'ONLISANS', ARRAY['Laborant', 'Tıbbi Laboratuvar']),
('Tıbbi Görüntüleme Teknikleri', 'ONLISANS', ARRAY['Radyoloji', 'Röntgen']),
('Ağız ve Diş Sağlığı', 'ONLISANS', ARRAY['Diş Teknikeri']),
('Diyaliz', 'ONLISANS', ARRAY['Diyaliz Teknikeri']),
('Fizyoterapi', 'ONLISANS', ARRAY['Fizik Tedavi Teknikeri']),
('Eczane Hizmetleri', 'ONLISANS', ARRAY['Eczane Teknikeri']),
('Yaşlı Bakımı', 'ONLISANS', ARRAY['Hasta ve Yaşlı Bakımı']),
('Çocuk Gelişimi (Önlisans)', 'ONLISANS', ARRAY['Çocuk Gelişimi']),
('Sosyal Hizmetler (Önlisans)', 'ONLISANS', ARRAY['Sosyal Hizmet']),

-- ÖNLİSANS - Mühendislik ve Saha Teknikleri
('Elektrik', 'ONLISANS', ARRAY['Elektrik Teknikeri']),
('Elektronik Teknolojisi', 'ONLISANS', ARRAY['Elektronik Haberleşme']),
('Makine (Önlisans)', 'ONLISANS', ARRAY['Makine Teknikeri']),
('İnşaat Teknolojisi', 'ONLISANS', ARRAY['İnşaat Teknikeri']),
('Harita ve Kadastro', 'ONLISANS', ARRAY['Harita Teknikeri', 'Tapu ve Kadastro']),
('Mekatronik', 'ONLISANS', ARRAY['Mekatronik Teknikeri']),
('İklimlendirme ve Soğutma Teknolojisi', 'ONLISANS', ARRAY['İklimlendirme']),
('Otomotiv Teknolojisi', 'ONLISANS', ARRAY['Otomotiv']),
('Sivil Savunma ve İtfaiyecilik', 'ONLISANS', ARRAY['İtfaiyecilik']),
('Özel Güvenlik ve Koruma', 'ONLISANS', ARRAY['Güvenlik']),
('Laboratuvar Teknolojisi', 'ONLISANS', ARRAY['Kimya Laboratuvarı']),
('Çevre Koruma ve Kontrol', 'ONLISANS', ARRAY['Çevre Teknikeri']),
('Aşçılık', 'ONLISANS', ARRAY['Mutfak Sanatları']),
('Turizm ve Otel İşletmeciliği', 'ONLISANS', ARRAY['Turizm']),

-- LİSE (ORTAÖĞRETİM) ALANLARI
('Genel Lise / Düz Lise', 'LISE', ARRAY['Tüm Lise Alanları', 'Herhangi Bir Ortaöğretim']),
('Anadolu Lisesi', 'LISE', ARRAY['Genel Ortaöğretim', 'Fen Lisesi']),
('İmam Hatip Lisesi', 'LISE', ARRAY['Anadolu İmam Hatip Lisesi']),
('Bilişim Teknolojileri (Lise)', 'LISE', ARRAY['Bilgisayar Bölümü', 'Web Programcılığı']),
('Büro Yönetimi (Lise)', 'LISE', ARRAY['Büro Yönetimi ve Yönetici Asistanlığı']),
('Sağlık Hizmetleri (Lise)', 'LISE', ARRAY['Hemşire Yardımcılığı', 'Ebe Yardımcılığı', 'Sağlık Bakım Teknisyenliği']),
('Elektrik-Elektronik Teknolojisi (Lise)', 'LISE', ARRAY['Elektrik', 'Elektronik']),
('Muhasebe ve Finansman (Lise)', 'LISE', ARRAY['Muhasebe']),
('Adalet (Lise)', 'LISE', ARRAY['Zabıt Katipliği']),
('Makine ve Tasarım Teknolojisi (Lise)', 'LISE', ARRAY['Torna Tesviye', 'Makine']),
('Motorlu Araçlar Teknolojisi (Lise)', 'LISE', ARRAY['Oto Tamir', 'Otomotiv']),
('İnşaat Teknolojisi (Lise)', 'LISE', ARRAY['Yapı Ressamlığı']),
('Kimya Teknolojisi (Lise)', 'LISE', ARRAY['Kimya Laboratuvarı']),
('Tesisat Teknolojisi ve İklimlendirme (Lise)', 'LISE', ARRAY['Sıhhi Tesisat', 'Doğalgaz']),
('Güvenlik Hizmetleri (Lise)', 'LISE', ARRAY['Özel Güvenlik'])
ON CONFLICT (name) DO NOTHING;
