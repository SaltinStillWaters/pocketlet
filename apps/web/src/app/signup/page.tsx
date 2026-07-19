'use client';

import { startRegistration } from '@simplewebauthn/browser';
import { useState } from 'react';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code' | 'passkey'>('email');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const requestCode = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/email-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { error?: string; code?: string; message?: string };
      if (!res.ok) {
        setError(data.error ?? 'Failed to send code');
        return;
      }
      // Testnet only: the server returns the code for display.
      setCode(data.code ?? '');
      setStep('code');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = (await res.json()) as { error?: string; verified?: boolean };
      if (!res.ok) {
        setError(data.error ?? 'Invalid code');
        return;
      }
      setStep('passkey');
    } finally {
      setLoading(false);
    }
  };

  const registerPasskey = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!window.PublicKeyCredential) {
        setError('Passkeys are not supported on this device or browser.');
        return;
      }
      const optionsRes = await fetch('/api/auth/register-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const options = await optionsRes.json();
      if (!optionsRes.ok) {
        setError(options.error ?? 'Failed to start passkey registration');
        return;
      }

      const attestation = await startRegistration({ optionsJSON: options });
      const verifyRes = await fetch('/api/auth/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, response: attestation }),
      });
      const verifyData = (await verifyRes.json()) as { error?: string; verified?: boolean };
      if (!verifyRes.ok) {
        setError(verifyData.error ?? 'Failed to verify passkey');
        return;
      }
      window.location.href = '/home';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Passkey registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-2xl font-bold text-pocketlet-600">Create your Pocketlet</h1>
        <p className="mb-6 text-sm text-gray-500">
          Sign up with your email and register a passkey. No password needed.
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        {step === 'email' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              requestCode();
            }}
            className="space-y-4"
          >
            <label className="block text-sm font-medium text-gray-700" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-pocketlet-500 focus:outline-none focus:ring-2 focus:ring-pocketlet-100"
              placeholder="you@example.com"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-pocketlet-600 py-2.5 font-semibold text-white hover:bg-pocketlet-700 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send verification code'}
            </button>
          </form>
        )}

        {step === 'code' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Enter the verification code sent to <strong>{email}</strong>.
            </p>
            <p className="text-xs text-amber-700">
              Testnet mode: the code is also shown below for easy testing.
            </p>
            <div className="rounded-lg bg-gray-100 p-3 text-center font-mono text-lg tracking-widest">
              {code}
            </div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-center font-mono text-lg tracking-widest focus:border-pocketlet-500 focus:outline-none focus:ring-2 focus:ring-pocketlet-100"
              placeholder="000000"
            />
            <button
              onClick={verifyCode}
              disabled={loading}
              className="w-full rounded-lg bg-pocketlet-600 py-2.5 font-semibold text-white hover:bg-pocketlet-700 disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify email'}
            </button>
          </div>
        )}

        {step === 'passkey' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Your email is verified. Register a passkey to secure your wallet.
            </p>
            <button
              onClick={registerPasskey}
              disabled={loading}
              className="w-full rounded-lg bg-pocketlet-600 py-2.5 font-semibold text-white hover:bg-pocketlet-700 disabled:opacity-50"
            >
              {loading ? 'Registering...' : 'Register passkey'}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
