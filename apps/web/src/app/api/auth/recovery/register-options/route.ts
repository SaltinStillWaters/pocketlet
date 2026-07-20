import { generateRegistrationOptions } from '@simplewebauthn/server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { RP_ID, RP_NAME } from '@/lib/auth/config';
import { getUserByEmail, isRecoveryReady, setPendingChallenge } from '@/lib/auth/store';
import {
  RECOVERY_COOKIE_NAME,
  verifyRecoveryToken,
} from '@/lib/auth/recovery-token';

export const dynamic = 'force-dynamic';

export async function POST(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _req: NextRequest
): Promise<NextResponse> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(RECOVERY_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'Recovery session not found' },
        { status: 401 }
      );
    }

    const payload = await verifyRecoveryToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid recovery session' },
        { status: 401 }
      );
    }

    const user = getUserByEmail(payload.email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!isRecoveryReady(payload.email)) {
      return NextResponse.json(
        { error: 'Waiting period has not elapsed' },
        { status: 403 }
      );
    }

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userID: Buffer.from(user.email),
      userName: user.email,
      userDisplayName: user.email,
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
        authenticatorAttachment: 'platform',
      },
    });

    setPendingChallenge(user.email, options.challenge);

    return NextResponse.json(options);
  } catch (err) {
    console.error('Recovery register options error:', err);
    return NextResponse.json(
      { error: 'Failed to generate registration options' },
      { status: 500 }
    );
  }
}
