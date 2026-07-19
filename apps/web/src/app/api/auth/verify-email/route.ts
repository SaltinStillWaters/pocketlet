import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, setEmailVerified } from '@/lib/auth/store';

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { email?: string; code?: string };
  const email = body.email?.trim().toLowerCase();
  const code = body.code?.trim();

  if (!email || !code) {
    return NextResponse.json({ error: 'Email and code are required' }, { status: 400 });
  }

  const user = getUserByEmail(email);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (user.verificationCode !== code) {
    return NextResponse.json({ error: 'Invalid verification code' }, { status: 401 });
  }

  setEmailVerified(email);
  return NextResponse.json({ email, verified: true });
}
