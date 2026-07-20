'use client';

import { useState } from 'react';

interface PinModalProps {
  isOpen: boolean;
  title?: string;
  onConfirm: (pin: string) => void;
  onCancel: () => void;
}

export default function PinModal({
  isOpen,
  title = 'Confirm with PIN',
  onConfirm,
  onCancel,
}: PinModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) {
    return null;
  }

  const submit = async () => {
    setError(null);
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      setError('PIN must be 6 digits');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/pin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'PIN verification failed');
        setPin('');
        return;
      }
      setPin('');
      onConfirm(pin);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PIN verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">{title}</h2>
        <p className="mb-4 text-sm text-gray-500">
          Enter your 6-digit PIN to continue.
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="mb-4 w-full rounded-lg border border-gray-300 px-4 py-3 text-center font-mono text-xl tracking-widest focus:border-pocketlet-500 focus:outline-none focus:ring-2 focus:ring-pocketlet-100"
          placeholder="000000"
          autoFocus
        />

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg bg-gray-100 py-2.5 font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading || pin.length !== 6}
            className="rounded-lg bg-pocketlet-600 py-2.5 font-semibold text-white hover:bg-pocketlet-700 disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
