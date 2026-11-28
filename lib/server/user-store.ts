import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { supabaseAdmin } from '@/lib/supabase/admin';

export interface StoredUserRecord {
  email: string;
  fullName: string;
  passwordHash?: string;
  profile: any;
  favorites: string[];
  isRegistered: boolean;
  registeredAt?: string;
  updatedAt: string;
  supabaseUserId?: string;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash?: string): boolean {
  if (!storedHash || !storedHash.includes(':')) return false;
  try {
    const [salt, keyHex] = storedHash.split(':');
    if (!salt || !keyHex) return false;
    const keyBuffer = Buffer.from(keyHex, 'hex');
    const derived = crypto.scryptSync(password, salt, 64);
    if (keyBuffer.length !== derived.length) return false;
    return crypto.timingSafeEqual(keyBuffer, derived);
  } catch {
    return false;
  }
}

export function getProfilesFilePath(): string {
  const baseDir = process.env.NODE_ENV === 'production' && process.platform !== 'win32' ? '/tmp' : process.cwd();
  return path.join(baseDir, '.user_profiles.json');
}

export function loadLocalProfiles(): Record<string, StoredUserRecord> {
  try {
    const filePath = getProfilesFilePath();
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (content) {
        return JSON.parse(content);
      }
    }
  } catch (e) {
    console.warn('Sunucu profil deposu okuma hatası:', e);
  }
  return {};
}

export function saveLocalProfiles(data: Record<string, StoredUserRecord>): void {
  try {
    const filePath = getProfilesFilePath();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Sunucu profil deposu yazma hatası:', e);
  }
}

/**
 * Supabase user_profiles tablosu schema.sql kısıtlamalarına %100 uyumlu kolonları seçer
 */
export function pickSchemaProfileFields(userId: string, profile: any, fullName?: string) {
  const validEduLevels = ['LISE', 'ONLISANS', 'LISANS'];
  const rawEdu = profile?.education_level;
  const safeEdu = validEduLevels.includes(rawEdu)
    ? rawEdu
    : rawEdu === 'YUKSEK_LISANS'
      ? 'LISANS'
      : null;

  const validKpssTypes = ['KPSSP3', 'KPSSP93', 'KPSSP94', 'KPSS_YOK'];
  const rawKpss = profile?.kpss_type;
  const safeKpss = validKpssTypes.includes(rawKpss) ? rawKpss : 'KPSSP3';

  const validAlesTypes = ['SAYISAL', 'ESIT_AGIRLIK', 'SOZEL'];
  const safeAles = validAlesTypes.includes(profile?.ales_type) ? profile.ales_type : null;

  const validYdsLevels = ['YOK', 'E', 'D', 'C', 'B', 'A'];
  const safeYds = validYdsLevels.includes(profile?.yds_level) ? profile.yds_level : 'YOK';

  const validGenders = ['ERKEK', 'KADIN', 'BELIRTILMEMIS'];
  const safeGender = validGenders.includes(profile?.gender) ? profile.gender : 'BELIRTILMEMIS';

  const validGradStatus = ['MEZUN', 'OGRENCI'];
  const safeGradStatus = validGradStatus.includes(profile?.graduation_status) ? profile.graduation_status : 'MEZUN';

  const validMilitary = ['YAPILDI', 'MUAFIYET', 'TECİLLİ', 'YOK'];
  const safeMilitary = validMilitary.includes(profile?.military_status) ? profile.military_status : 'YOK';

  return {
    user_id: userId,
    full_name: fullName || profile?.full_name || null,
    birth_date: profile?.birth_date && /^\d{4}-\d{2}-\d{2}$/.test(profile.birth_date) ? profile.birth_date : null,
    gender: safeGender,
    education_level: safeEdu,
    department: profile?.department || null,
    graduation_status: safeGradStatus,
    kpss_type: safeKpss,
    kpss_score: typeof profile?.kpss_score === 'number' && profile.kpss_score >= 0 && profile.kpss_score <= 100 ? profile.kpss_score : 0,
    ales_type: safeAles,
    ales_score: typeof profile?.ales_score === 'number' && profile.ales_score >= 0 && profile.ales_score <= 100 ? profile.ales_score : null,
    yds_level: safeYds,
    yds_score: typeof profile?.yds_score === 'number' && profile.yds_score >= 0 && profile.yds_score <= 100 ? profile.yds_score : null,
    military_status: safeMilitary,
    residence_city: profile?.residence_city || profile?.city || null,
    certificates: Array.isArray(profile?.certificates) ? profile.certificates : [],
    preferred_cities: Array.isArray(profile?.preferred_cities) ? profile.preferred_cities : [],
    telegram_chat_id: profile?.telegram_chat_id || null,
    notify_enabled: profile?.notify_enabled !== undefined ? Boolean(profile.notify_enabled) : true,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Supabase Auth içinde e-postaya göre kullanıcıyı bulur
 */
export async function findSupabaseUserByEmail(email: string) {
  if (!supabaseAdmin) return null;
  const normEmail = email.toLowerCase().trim();
  try {
    let page = 1;
    while (page <= 10) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      if (error || !data?.users?.length) break;
      const matched = data.users.find((u) => u.email?.toLowerCase().trim() === normEmail);
      if (matched) return matched;
      if (data.users.length < 200) break;
      page++;
    }
  } catch (e) {
    console.warn('Supabase kullanıcı arama hatası:', e);
  }
  return null;
}

export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
