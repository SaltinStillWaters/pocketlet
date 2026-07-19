import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { NextRequest, NextResponse } from 'next/server';
import { ORIGIN, RP_ID } from '@/lib/auth/config';
import { getUserByEmail, setCredential } from '@/lib/auth/store';
import { createSessionToken, cookieOptions } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    email?: string;
    response?: unknown;
  };
  const email = body.email?.trim().toLowerCase();
  const response = body.response;

  if (!email || !response) {
    return NextResponse.json({ error: 'Email and passkey response are required' }, { status: 400 });
  }

  const user = getUserByEmail(email);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (!user.pendingChallenge) {
    return NextResponse.json({ error: 'No pending registration challenge' }, { status: 400 });
  }

  try {
    const verification = await verifyRegistrationResponse({
      response: response as never,
      expectedChallenge: user.pendingChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: 'Passkey verification failed' }, { status: 401 });
    }

    const credential = verification.registrationInfo.credential;
    setCredential(email, {
      id: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString('base64url'),
      counter: credential.counter,
      transports: credential.transports ?? undefined,
    });

    const token = await createSessionToken({ email });
    const res = NextResponse.json({ email, verified: true });
    const opts = cookieOptions();
    res.cookies.set(opts.name, token, {
      httpOnly: opts.httpOnly,
      secure: opts.secure,
      sameSite: opts.sameSite,
      domain: opts.domain,
      maxAge: opts.maxAge,
      path: opts.path,
    });
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
