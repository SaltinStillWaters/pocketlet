'use client';

import { startRegistration } from '@simplewebauthn/browser';
import { useEffect, useState } from 'react';
import Link from 'next/link';

type RecoveryStep =
  | 'email'
  | 'verify'
  | 'waiting'
  | 'register'
  | 'success'
  | 'unrecoverable';

interface RecoveryStatus {
  status: 'pending' | 'ready';
  readyAfter: string;
  waitingPeriodMs: number;
}

export default function RecoverPage() {
  const [step, setStep] = useState<RecoveryStep>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [readyAfter, setReadyAfter] = useState<string | null>(null);
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    if (!readyAfter || step !== 'waiting') {
      return;
    }
    const updateCountdown = () => {
      const remaining = new Date(readyAfter).getTime() - Date.now();
      if (remaining <= 0) {
        setCountdown('Ready now');
        return;
      }
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
      setCountdown(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };
    updateCountdown();
    const id = setInterval(updateCountdown, 1000);
    return () => clearInterval(id);
  }, [readyAfter, step]);

  useEffect(() => {
    if (step !== 'waiting') {
      return;
    }
    const poll = async () => {
      try {
        const res = await fetch('/api/auth/recovery/status');
        if (res.ok) {
          const status = (await res.json()) as RecoveryStatus;
          setReadyAfter(status.readyAfter);
          if (status.status === 'ready') {
            setStep('register');
          }
        }
      } catch {
        // Ignore polling errors; user can continue manually.
      }
    };
    poll();
    const id = setInterval(poll, 30000);
    return () => clearInterval(id);
  }, [step]);

  const initiate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/recovery/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const body = (await res.json()) as { error?: string; code?: string };
      if (!res.ok) {
        if (res.status === 404) {
          setStep('unrecoverable');
          return;
        }
        setError(body.error ?? 'Failed to initiate recovery');
        return;
      }
      setCode(body.code ?? '');
      setStep('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate recovery');
    } finally {
      setLoading(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/recovery/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const body = (await res.json()) as {
        error?: string;
        verified?: boolean;
        readyAfter?: string;
      };
      if (!res.ok) {
        setError(body.error ?? 'Verification failed');
        return;
      }
      if (body.readyAfter) {
        setReadyAfter(body.readyAfter);
      }
      setStep('waiting');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const registerPasskey = async () => {
    setError(null);
    setLoading(true);
    try {
      const optionsRes = await fetch('/api/auth/recovery/register-options', {
        method: 'POST',
      });
      const options = (await optionsRes.json()) as { error?: string };
      if (!optionsRes.ok) {
        setError(options.error ?? 'Failed to start passkey registration');
        return;
      }

      const attestation = await startRegistration({ optionsJSON: options as never });
      const verifyRes = await fetch('/api/auth/recovery/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: attestation }),
      });
      const body = (await verifyRes.json()) as { error?: string; verified?: boolean };
      if (!verifyRes.ok) {
        setError(body.error ?? 'Failed to register new passkey');
        return;
      }
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register new passkey');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'unrecoverable') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg text-center">
          <h1 className="mb-2 text-2xl font-bold text-red-600">Account not recoverable</h1>
          <p className="mb-6 text-sm text-gray-600">
            We could not find a recoverable account for that email. If you have lost both your
            passkey and email access, your account cannot be recovered.
          </p>
          <Link
            href="/login"
            className="inline-block rounded-lg bg-pocketlet-600 px-4 py-2 font-semibold text-white hover:bg-pocketlet-700"
          >
            Back to login
          </Link>
        </div>
      </main>
    );
  }

  if (step === 'success') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-600">
            ✓
          </div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Recovery complete</h1>
          <p className="mb-6 text-sm text-gray-600">
            Your new passkey is registered. You can now log in normally.
          </p>
          <Link
            href="/home"
            className="inline-block rounded-lg bg-pocketlet-600 px-4 py-2 font-semibold text-white hover:bg-pocketlet-700"
          >
            Go home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/login" className="text-2xl font-bold text-pocketlet-600">
            ← Pocketlet
          </Link>
        </div>

        <h1 className="mb-2 text-2xl font-bold text-gray-900">Recover your account</h1>
        <p className="mb-6 text-sm text-gray-500">
          Recover access with your registered email and a new passkey.
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        {step === 'email' && (
          <form onSubmit={initiate} className="space-y-4">
            <label className="block text-sm font-medium text-gray-700" htmlFor="email">
              Registered email
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
              {loading ? 'Sending code...' : 'Send recovery code'}
            </button>
          </form>
        )}

        {step === 'verify' && (
          <form onSubmit={verify} className="space-y-4">
            <p className="text-sm text-gray-600">
              A recovery code has been sent to{' '}
              <span className="font-medium text-gray-900">{email}</span>. Enter it below to
              continue.
            </p>
            <label className="block text-sm font-medium text-gray-700" htmlFor="code">
              Recovery code
            </label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-pocketlet-500 focus:outline-none focus:ring-2 focus:ring-pocketlet-100"
              placeholder="123456"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-pocketlet-600 py-2.5 font-semibold text-white hover:bg-pocketlet-700 disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify code'}
            </button>
          </form>
        )}

        {step === 'waiting' && (
          <div className="space-y-4 text-center">
            <div className="rounded-lg bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-800">Waiting period</p>
              <p className="mt-1 text-2xl font-bold text-amber-900">{countdown}</p>
            </div>
            <p className="text-sm text-gray-600">
              For your security, you must wait before registering a new passkey. Keep this page
              open; it will update automatically.
            </p>
          </div>
        )}

        {step === 'register' && (
          <div className="space-y-4 text-center">
            <p className="text-sm text-gray-600">
              Your waiting period is over. Register a new passkey to complete recovery.
            </p>
            <button
              onClick={registerPasskey}
              disabled={loading}
              className="w-full rounded-lg bg-pocketlet-600 py-2.5 font-semibold text-white hover:bg-pocketlet-700 disabled:opacity-50"
            >
              {loading ? 'Registering...' : 'Register new passkey'}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
