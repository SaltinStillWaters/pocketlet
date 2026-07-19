import { SignJWT, jwtVerify } from 'jose';
import {
  ORIGIN,
  RP_ID,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE,
  SESSION_SECRET,
} from './config';

export interface SessionPayload {
  email: string;
}

const encoder = new TextEncoder();

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(encoder.encode(SESSION_SECRET));
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, encoder.encode(SESSION_SECRET), {
      algorithms: ['HS256'],
    });
    if (typeof payload.email !== 'string') {
      return null;
    }
    return { email: payload.email };
  } catch {
    return null;
  }
}

export function cookieOptions() {
  const isSecure = ORIGIN.startsWith('https://');
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax' as const,
    domain: RP_ID === 'localhost' ? undefined : RP_ID,
    maxAge: SESSION_MAX_AGE,
    path: '/',
  };
}
