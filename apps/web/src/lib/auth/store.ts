import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { AuthenticatorTransportFuture } from '@simplewebauthn/server';
import { hashPin, verifyPin } from './pin';

export interface Credential {
  id: string;
  publicKey: string;
  counter: number;
  transports?: AuthenticatorTransportFuture[];
}

export interface User {
  email: string;
  emailVerified: boolean;
  verificationCode?: string;
  pendingChallenge?: string;
  credential?: Credential;
  contractId?: string;
  ownerSecretKey?: string;
  stellarAddress?: string;
  pinHash?: string;
  pinResetCode?: string;
  createdAt: string;
}

function getDataDir(): string {
  return process.env.POCKETLET_DATA_DIR ?? join(process.cwd(), '.data');
}

function getUsersFile(): string {
  return join(getDataDir(), 'users.json');
}

function loadUsers(): Record<string, User> {
  const file = getUsersFile();
  if (!existsSync(file)) {
    return {};
  }
  const raw = readFileSync(file, 'utf-8');
  try {
    return JSON.parse(raw) as Record<string, User>;
  } catch {
    return {};
  }
}

function saveUsers(users: Record<string, User>): void {
  const dir = getDataDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(getUsersFile(), JSON.stringify(users, null, 2));
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getUserByEmail(email: string): User | undefined {
  const users = loadUsers();
  return users[normalizeEmail(email)];
}

export function createUser(email: string, verificationCode: string): User {
  const users = loadUsers();
  const normalized = normalizeEmail(email);
  if (users[normalized]) {
    throw new Error('Email already registered');
  }
  const user: User = {
    email: normalized,
    emailVerified: false,
    verificationCode,
    createdAt: new Date().toISOString(),
  };
  users[normalized] = user;
  saveUsers(users);
  return user;
}

export function setEmailVerified(email: string): User {
  const users = loadUsers();
  const normalized = normalizeEmail(email);
  const user = users[normalized];
  if (!user) {
    throw new Error('User not found');
  }
  user.emailVerified = true;
  delete user.verificationCode;
  saveUsers(users);
  return user;
}

export function setPendingChallenge(email: string, challenge: string): User {
  const users = loadUsers();
  const normalized = normalizeEmail(email);
  const user = users[normalized];
  if (!user) {
    throw new Error('User not found');
  }
  user.pendingChallenge = challenge;
  saveUsers(users);
  return user;
}

export function setCredential(email: string, credential: Credential): User {
  const users = loadUsers();
  const normalized = normalizeEmail(email);
  const user = users[normalized];
  if (!user) {
    throw new Error('User not found');
  }
  user.credential = credential;
  delete user.pendingChallenge;
  saveUsers(users);
  return user;
}

export interface WalletInfo {
  contractId: string;
  ownerSecretKey: string;
  stellarAddress: string;
}

export function setWallet(email: string, wallet: WalletInfo): User {
  const users = loadUsers();
  const normalized = normalizeEmail(email);
  const user = users[normalized];
  if (!user) {
    throw new Error('User not found');
  }
  user.contractId = wallet.contractId;
  user.ownerSecretKey = wallet.ownerSecretKey;
  user.stellarAddress = wallet.stellarAddress;
  saveUsers(users);
  return user;
}

export function updateCredentialCounter(email: string, counter: number): User {
  const users = loadUsers();
  const normalized = normalizeEmail(email);
  const user = users[normalized];
  if (!user || !user.credential) {
    throw new Error('User or credential not found');
  }
  user.credential.counter = counter;
  saveUsers(users);
  return user;
}

export function setPin(email: string, pin: string): User {
  const users = loadUsers();
  const normalized = normalizeEmail(email);
  const user = users[normalized];
  if (!user) {
    throw new Error('User not found');
  }
  user.pinHash = hashPin(pin);
  saveUsers(users);
  return user;
}

export function verifyPinForUser(email: string, pin: string): boolean {
  const user = getUserByEmail(email);
  if (!user || !user.pinHash) {
    return false;
  }
  return verifyPin(pin, user.pinHash);
}

export function hasPin(email: string): boolean {
  const user = getUserByEmail(email);
  return Boolean(user?.pinHash);
}

export function setPinResetCode(email: string, code: string): User {
  const users = loadUsers();
  const normalized = normalizeEmail(email);
  const user = users[normalized];
  if (!user) {
    throw new Error('User not found');
  }
  user.pinResetCode = code;
  saveUsers(users);
  return user;
}

export function verifyPinResetCode(email: string, code: string): boolean {
  const user = getUserByEmail(email);
  return user?.pinResetCode === code;
}

export function clearPinResetCode(email: string): User {
  const users = loadUsers();
  const normalized = normalizeEmail(email);
  const user = users[normalized];
  if (!user) {
    throw new Error('User not found');
  }
  delete user.pinResetCode;
  saveUsers(users);
  return user;
}
