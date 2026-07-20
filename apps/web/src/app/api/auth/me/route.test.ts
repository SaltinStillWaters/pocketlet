import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GET } from './route';
import { createUser, setEmailVerified, setCredential, setProfile } from '@/lib/auth/store';
import { createSessionToken } from '@/lib/auth/session';
import { SESSION_COOKIE_NAME } from '@/lib/auth/config';

let dataDir: string;
let cookieJar: Record<string, string> = {};

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockImplementation(() => ({
    get: (name: string) => (cookieJar[name] ? { value: cookieJar[name], name } : undefined),
    set: (name: string, value: string) => {
      cookieJar[name] = value;
    },
  })),
}));

beforeEach(() => {
  dataDir = mkdtempSync(join(tmpdir(), 'pocketlet-me-'));
  process.env.POCKETLET_DATA_DIR = dataDir;
  cookieJar = {};
});

afterEach(() => {
  rmSync(dataDir, { recursive: true, force: true });
  delete process.env.POCKETLET_DATA_DIR;
  vi.clearAllMocks();
});

describe('GET /api/auth/me', () => {
  it('returns 401 without a session cookie', async () => {
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns the current user with username and phone', async () => {
    createUser('alice@example.com', '000000');
    setEmailVerified('alice@example.com');
    setCredential('alice@example.com', {
      id: 'cred-id',
      publicKey: 'base64-pubkey',
      counter: 0,
    });
    setProfile('alice@example.com', { username: 'alice', phone: '+639123456789' });

    const token = await createSessionToken({ email: 'alice@example.com' });
    cookieJar[SESSION_COOKIE_NAME] = token;

    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      user: { email: string; username?: string; phone?: string };
    };
    expect(body.user.email).toBe('alice@example.com');
    expect(body.user.username).toBe('alice');
    expect(body.user.phone).toBe('+639123456789');
  });
});
