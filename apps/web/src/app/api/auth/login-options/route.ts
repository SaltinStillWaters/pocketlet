import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { NextRequest, NextResponse } from 'next/server';
import { RP_ID } from '@/lib/auth/config';
import { getUserByEmail, setPendingChallenge } from '@/lib/auth/store';

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { email?: string };
  const email = body.email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const user = getUserByEmail(email);
  if (!user || !user.credential) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    allowCredentials: [
      {
        id: user.credential.id,
        transports: user.credential.transports,
      },
    ],
    userVerification: 'preferred',
  });

  setPendingChallenge(email, options.challenge);

  return NextResponse.json(options);
}
