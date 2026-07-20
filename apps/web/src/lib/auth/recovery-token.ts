import { SignJWT, jwtVerify } from 'jose';
import {
  ORIGIN,
  RP_ID,
  SESSION_SECRET,
} from './config';
import { getRecoveryWaitingPeriodMs } from './recovery';

export const RECOVERY_COOKIE_NAME = 'pocketlet_recovery';

export interface RecoveryTokenPayload {
  email: string;
  purpose: 'recovery';
}

const encoder = new TextEncoder();

export async function createRecoveryToken(email: string): Promise<string> {
  const maxAgeSeconds = Math.floor(getRecoveryWaitingPeriodMs() / 1000) + 60 * 60; // waiting period + 1 hour buffer
  return new SignJWT({ email, purpose: 'recovery' } as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSeconds}s`)
    .sign(encoder.encode(SESSION_SECRET));
}

export async function verifyRecoveryToken(token: string): Promise<RecoveryTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, encoder.encode(SESSION_SECRET), {
      algorithms: ['HS256'],
    });
    if (
      typeof payload.email !== 'string' ||
      payload.purpose !== 'recovery'
    ) {
      return null;
    }
    return { email: payload.email, purpose: 'recovery' };
  } catch {
    return null;
  }
}

export function recoveryCookieOptions() {
  const isSecure = ORIGIN.startsWith('https://');
  const maxAgeSeconds = Math.floor(getRecoveryWaitingPeriodMs() / 1000) + 60 * 60;
  return {
    name: RECOVERY_COOKIE_NAME,
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax' as const,
    domain: RP_ID === 'localhost' ? undefined : RP_ID,
    maxAge: maxAgeSeconds,
    path: '/',
  };
}
