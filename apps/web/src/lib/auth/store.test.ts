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
});
