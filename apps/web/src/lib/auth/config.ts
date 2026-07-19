export const RP_NAME = process.env.WEBAUTHN_RP_NAME ?? 'Pocketlet';
export const RP_ID = process.env.WEBAUTHN_RP_ID ?? 'localhost';
export const ORIGIN = process.env.WEBAUTHN_ORIGIN ?? 'http://localhost:3000';

export const SESSION_COOKIE_NAME = 'pocketlet_session';
export const SESSION_SECRET = process.env.SESSION_SECRET ?? 'dev-secret-change-in-production';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
