import { generateRegistrationOptions } from '@simplewebauthn/server';
import { NextRequest, NextResponse } from 'next/server';
import { RP_ID, RP_NAME } from '@/lib/auth/config';
import { getUserByEmail, setPendingChallenge } from '@/lib/auth/store';

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { email?: string };
  const email = body.email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const user = getUserByEmail(email);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (!user.emailVerified) {
    return NextResponse.json(
      { error: 'Email must be verified before registering a passkey' },
      { status: 403 }
    );
  }

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: Buffer.from(email),
    userName: email,
    userDisplayName: email,
    attestationType: 'none',
    excludeCredentials: user.credential
      ? [
          {
            id: user.credential.id,
            transports: user.credential.transports,
          },
        ]
      : [],
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  });

  setPendingChallenge(email, options.challenge);

  return NextResponse.json(options);
}
