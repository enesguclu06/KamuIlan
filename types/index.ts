export type EducationLevel = 'LISE' | 'ONLISANS' | 'LISANS' | 'YUKSEK_LISANS';
export type KpssType = 'KPSSP3' | 'KPSSP93' | 'KPSSP94' | 'KPSSP48' | 'KPSSP43' | 'KPSSP32' | 'KPSS_YOK' | string;
export type AlesType = 'SAYISAL' | 'ESIT_AGIRLIK' | 'SOZEL';
export type YdsLevel = 'YOK' | 'E' | 'D' | 'C' | 'B' | 'A';
export type GenderRequirement = 'HEPSI' | 'ERKEK' | 'KADIN';
export type ExamType = 'MULAKAT' | 'KPSS_PUAN_USTUNLUGU' | 'UYGULAMALI' | 'KURUM_SINAVI';
export type GraduationStatus = 'MEZUN' | 'OGRENCI';
export type MilitaryStatus = 'YAPILDI' | 'MUAFIYET' | 'TECİLLİ' | 'YOK';
export type MatchStatus = 'UYGUN' | 'BELKI' | 'UYMADI';

export interface Department {
  id: string;
  name: string;
  education_level: EducationLevel;
  aliases: string[];
}

export interface Announcement {
  id: string;
  source: 'RESMI_GAZETE' | 'KARIYER_KAPISI' | 'MANUEL';
  source_url: string;
  institution: string;
  title: string;
  publish_date: string;
  application_start_date?: string;
  deadline: string;
  application_method: string;
  raw_summary: string | null;
  is_active: boolean;
  created_at: string;
  positions?: Position[];
}

export interface Position {
  id: string;
  announcement_id: string;
  title: string;
  quota: number;
  education_level: EducationLevel;
  kpss_type: KpssType;
  min_kpss_score: number;
  min_ales_score?: number | null;
  ales_type?: AlesType | null;
  allowed_departments: string[];
  is_any_department: boolean;
  min_yds_level: YdsLevel;
  min_yds_score?: number | null;
  max_age: number | null;
  gender_requirement: GenderRequirement;
  min_height?: number | null;
  min_height_male?: number | null;
  min_height_female?: number | null;
  cities: string[];
  special_conditions: string[];
  exam_type: ExamType;
  created_at?: string;
}

export interface UserProfile {
  user_id?: string;
  full_name?: string;
  birth_date?: string;
  gender?: 'ERKEK' | 'KADIN' | 'BELIRTILMEMIS';
  height?: number;
  weight?: number;
  military_status?: MilitaryStatus;
  education_level?: EducationLevel;
  department?: string;
  graduation_status?: GraduationStatus;
  graduation_year?: number;
  expected_graduation_date?: string;
  kpss_type?: KpssType;
  kpss_score?: number;
  ales_type?: AlesType;
  ales_score?: number;
  yds_level?: YdsLevel;
  yds_score?: number;
  certificates?: string[];
  preferred_cities?: string[];
  residence_city?: string;
  city?: string;
  telegram_chat_id?: string;
  notify_enabled?: boolean;
}

export interface MatchEvaluation {
  status: MatchStatus;
  reasons: string[];
  isMatch: boolean;
  criteriaMatrix: {
    education: { match: boolean; user: string; required: string };
    department: { match: boolean; user: string; required: string };
    kpss: { match: boolean; user: string; required: string };
    ales?: { match: boolean; user: string; required: string };
    yds: { match: boolean; user: string; required: string };
    age: { match: boolean; user: string; required: string };
    gender: { match: boolean; user: string; required: string };
    graduation: { match: boolean; message: string };
    height?: { match: boolean; user: string; required: string };
    specialConditions: { match: boolean; pendingConditions: string[] };
  };
}

export interface AnnouncementMatchSummary {
  bestStatus: MatchStatus;
  suitableCount: number;
  maybeCount: number;
  unfitCount: number;
  matchedPositions: { position: Position; evaluation: MatchEvaluation }[];
}
