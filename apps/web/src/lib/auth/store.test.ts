import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createUser,
  getUserByEmail,
  setEmailVerified,
  setCredential,
  updateCredentialCounter,
  setPin,
  verifyPinForUser,
  hasPin,
  setPinResetCode,
  verifyPinResetCode,
  clearPinResetCode,
} from './store';

let dataDir: string;

beforeEach(() => {
  dataDir = mkdtempSync(join(tmpdir(), 'pocketlet-store-'));
  process.env.POCKETLET_DATA_DIR = dataDir;
});

afterEach(() => {
  rmSync(dataDir, { recursive: true, force: true });
  delete process.env.POCKETLET_DATA_DIR;
});

describe('auth store', () => {
  it('creates a user with a verification code', () => {
    const user = createUser('Alice@Example.com', '123456');
    expect(user.email).toBe('alice@example.com');
    expect(user.emailVerified).toBe(false);
    expect(user.verificationCode).toBe('123456');

    const found = getUserByEmail('ALICE@EXAMPLE.COM');
    expect(found).toEqual(user);
  });

  it('verifies an email', () => {
    createUser('test@example.com', '654321');
    const verified = setEmailVerified('test@example.com');
    expect(verified.emailVerified).toBe(true);
    expect(verified.verificationCode).toBeUndefined();
  });

  it('stores a credential and counter', () => {
    createUser('u@example.com', '000000');
    const credential = {
      id: 'cred-id',
      publicKey: 'base64-pubkey',
      counter: 0,
    };
    setCredential('u@example.com', credential);
    const updated = updateCredentialCounter('u@example.com', 1);
    expect(updated.credential).toEqual({ ...credential, counter: 1 });
  });

  it('throws when creating a duplicate user', () => {
    createUser('dup@example.com', '111111');
    expect(() => createUser('DUP@EXAMPLE.COM', '222222')).toThrow('already registered');
  });

  it('stores a PIN hash and verifies a correct PIN', () => {
    createUser('pin@example.com', '000000');
    setPin('pin@example.com', '123456');
    expect(hasPin('pin@example.com')).toBe(true);
    expect(verifyPinForUser('pin@example.com', '123456')).toBe(true);
    expect(verifyPinForUser('pin@example.com', '654321')).toBe(false);
  });

  it('does not store the PIN in plain text', () => {
    createUser('secure@example.com', '000000');
    const user = setPin('secure@example.com', '654321');
    expect(user.pinHash).toBeDefined();
    expect(user.pinHash).not.toContain('654321');
    expect(user.pinHash).toMatch(/^[a-f0-9]{32}:[a-f0-9]{64}$/);
  });

  it('manages PIN reset codes', () => {
    createUser('reset@example.com', '000000');
    setPinResetCode('reset@example.com', '987654');
    expect(verifyPinResetCode('reset@example.com', '987654')).toBe(true);
    expect(verifyPinResetCode('reset@example.com', '111111')).toBe(false);
    clearPinResetCode('reset@example.com');
    expect(verifyPinResetCode('reset@example.com', '987654')).toBe(false);
  });
});
