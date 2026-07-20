import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';

const PIN_HASH_ITERATIONS = 100_000;
const PIN_HASH_KEYLEN = 32;
const PIN_HASH_DIGEST = 'sha256';

export interface PinHash {
  salt: string;
  hash: string;
}

function serializePinHash({ salt, hash }: PinHash): string {
  return `${salt}:${hash}`;
}

function deserializePinHash(value: string): PinHash {
  const [salt, hash] = value.split(':');
  if (!salt || !hash) {
    throw new Error('Invalid PIN hash format');
  }
  return { salt, hash };
}

export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(
    pin,
    salt,
    PIN_HASH_ITERATIONS,
    PIN_HASH_KEYLEN,
    PIN_HASH_DIGEST
  ).toString('hex');
  return serializePinHash({ salt, hash });
}

export function verifyPin(pin: string, storedHash: string): boolean {
  try {
    const { salt, hash } = deserializePinHash(storedHash);
    const computed = pbkdf2Sync(
      pin,
      salt,
      PIN_HASH_ITERATIONS,
      PIN_HASH_KEYLEN,
      PIN_HASH_DIGEST
    );
    const expected = Buffer.from(hash, 'hex');
    if (computed.length !== expected.length) {
      return false;
    }
    return timingSafeEqual(computed, expected);
  } catch {
    return false;
  }
}

export function isPinWellFormed(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}
