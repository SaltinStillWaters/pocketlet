import { describe, it, expect } from 'vitest';
import { hashPin, isPinWellFormed, verifyPin } from './pin';

describe('pin hashing', () => {
  it('accepts a 6-digit PIN', () => {
    expect(isPinWellFormed('123456')).toBe(true);
    expect(isPinWellFormed('000000')).toBe(true);
  });

  it('rejects malformed PINs', () => {
    expect(isPinWellFormed('12345')).toBe(false);
    expect(isPinWellFormed('1234567')).toBe(false);
    expect(isPinWellFormed('abcdef')).toBe(false);
    expect(isPinWellFormed('12 345')).toBe(false);
    expect(isPinWellFormed('')).toBe(false);
  });

  it('hashes a PIN without storing plain text', () => {
    const hashed = hashPin('111222');
    expect(hashed).not.toContain('111222');
    expect(hashed).toMatch(/^[a-f0-9]{32}:[a-f0-9]{64}$/);
  });

  it('verifies a correct PIN', () => {
    const hashed = hashPin('333444');
    expect(verifyPin('333444', hashed)).toBe(true);
  });

  it('rejects an incorrect PIN', () => {
    const hashed = hashPin('555666');
    expect(verifyPin('555667', hashed)).toBe(false);
    expect(verifyPin('000000', hashed)).toBe(false);
  });

  it('produces different hashes for the same PIN due to random salts', () => {
    const first = hashPin('777888');
    const second = hashPin('777888');
    expect(first).not.toBe(second);
    expect(verifyPin('777888', first)).toBe(true);
    expect(verifyPin('777888', second)).toBe(true);
  });

  it('returns false for an invalid stored hash', () => {
    expect(verifyPin('123456', 'not-a-hash')).toBe(false);
    expect(verifyPin('123456', 'short')).toBe(false);
  });
});
