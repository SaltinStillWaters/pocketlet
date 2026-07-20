import { describe, it, expect } from 'vitest';
import {
  createRecoveryToken,
  verifyRecoveryToken,
  recoveryCookieOptions,
  RECOVERY_COOKIE_NAME,
} from './recovery-token';

describe('recovery token', () => {
  it('round-trips a valid recovery token', async () => {
    const token = await createRecoveryToken('user@example.com');
    const payload = await verifyRecoveryToken(token);
    expect(payload).toEqual({ email: 'user@example.com', purpose: 'recovery' });
  });

  it('rejects a tampered token', async () => {
    const token = await createRecoveryToken('user@example.com');
    const [header, payload, signature] = token.split('.');
    const tamperedPayload = signature
      ? `${header}.${payload.slice(0, -1)}${payload.endsWith('A') ? 'B' : 'A'}.${signature}`
      : token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A');
    const verified = await verifyRecoveryToken(tamperedPayload);
    expect(verified).toBeNull();
  });

  it('rejects an empty token', async () => {
    const payload = await verifyRecoveryToken('');
    expect(payload).toBeNull();
  });

  it('returns recovery cookie options', () => {
    delete process.env.RECOVERY_WAITING_PERIOD_MS;
    const opts = recoveryCookieOptions();
    expect(opts.name).toBe(RECOVERY_COOKIE_NAME);
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe('lax');
    expect(opts.path).toBe('/');
    expect(opts.maxAge).toBeGreaterThan(0);
  });
});
