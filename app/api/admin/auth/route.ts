import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_COOKIE_NAME,
  verifyAdminPin,
  createAdminSessionToken,
  isAdminAuthorized,
} from '@/lib/server/admin-auth';

export async function GET(req: NextRequest) {
  return NextResponse.json({
    authenticated: isAdminAuthorized(req),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pin = typeof body?.pin === 'string' ? body.pin : '';

    if (!verifyAdminPin(pin)) {
      return NextResponse.json(
        { error: 'Hatalı yönetici şifresi! Erişim engellendi.' },
        { status: 401 }
      );
    }

    const token = createAdminSessionToken();
    const res = NextResponse.json({ success: true, authenticated: true });
    res.cookies.set(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 12 * 60 * 60,
    });
    return res;
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true, authenticated: false });
  res.cookies.set(ADMIN_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return res;
}
