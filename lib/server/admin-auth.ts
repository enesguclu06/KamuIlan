import crypto from 'crypto';
import { NextRequest } from 'next/server';

const ADMIN_COOKIE_NAME = 'kamu_ilan_admin_session';

function getAdminPin(): string {
  return process.env.ADMIN_PIN || process.env.NEXT_PUBLIC_ADMIN_PIN || 'Enes20041818/';
}

function getSessionSecret(): string {
  return process.env.ADMIN_SESSION_SECRET || `${getAdminPin()}_kamuilan_session_secret_2026`;
}

export function verifyAdminPin(inputPin: string): boolean {
  const expected = getAdminPin().trim();
  const clean = (inputPin || '').trim();
  if (!clean || clean.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(clean, 'utf8'), Buffer.from(expected, 'utf8'));
  } catch {
    return false;
  }
}

export function createAdminSessionToken(): string {
  const issuedAt = Date.now().toString();
  const sig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(issuedAt)
    .digest('hex');
  return `${issuedAt}.${sig}`;
}

export function verifyAdminSessionToken(token?: string | null): boolean {
  if (!token || !token.includes('.')) return false;
  try {
    const [issuedAtStr, sig] = token.split('.');
    if (!issuedAtStr || !sig) return false;

    const issuedAt = Number(issuedAtStr);
    if (!Number.isFinite(issuedAt)) return false;

    // 12 saatlik geçerlilik süresi
    if (Date.now() - issuedAt > 12 * 60 * 60 * 1000) return false;

    const expectedSig = crypto
      .createHmac('sha256', getSessionSecret())
      .update(issuedAtStr)
      .digest('hex');

    const bufA = Buffer.from(sig, 'hex');
    const bufB = Buffer.from(expectedSig, 'hex');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export function isAdminAuthorized(req: NextRequest): boolean {
  const cookieToken = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (verifyAdminSessionToken(cookieToken)) {
    return true;
  }
  const headerPin = req.headers.get('x-admin-pin');
  if (headerPin && verifyAdminPin(headerPin)) {
    return true;
  }
  return false;
}

export { ADMIN_COOKIE_NAME };
