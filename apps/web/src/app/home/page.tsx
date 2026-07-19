'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface BalanceData {
  xlm: string;
  usdc: string;
  contractId: string;
  stellarAddress: string;
}

export default function HomePage() {
  const [data, setData] = useState<BalanceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBalance = async () => {
    const res = await fetch('/api/wallet/balance');
    if (res.status === 401) {
      window.location.href = '/login';
      return;
    }
    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      setError(body.error ?? 'Failed to load wallet');
      setLoading(false);
      return;
    }
    setData(await res.json());
    setError(null);
    setLoading(false);
  };

  useEffect(() => {
    fetchBalance();
    const id = setInterval(fetchBalance, 15000);
    return () => clearInterval(id);
  }, []);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  const format = (value: string) => {
    const num = Number(value) / 10_000_000;
    return num.toLocaleString(undefined, { maximumFractionDigits: 7 });
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-gray-600">Loading your wallet...</div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md rounded-2xl bg-white p-8 shadow-lg text-center">
          <h1 className="mb-2 text-xl font-semibold text-red-600">Wallet unavailable</h1>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-pocketlet-600 px-4 py-2 text-white hover:bg-pocketlet-700"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-pocketlet-600">Pocketlet</h1>
          <button
            onClick={logout}
            className="text-sm text-gray-500 underline hover:text-gray-700"
          >
            Log out
          </button>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-lg">
          <p className="text-sm text-gray-500">Total balance</p>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            {format(data.usdc)} USDC
          </div>
          <div className="mt-1 text-sm text-gray-500">
            {format(data.xlm)} XLM
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <Link
              href="/receive"
              className="rounded-lg bg-pocketlet-100 py-3 text-center font-semibold text-pocketlet-700 hover:bg-pocketlet-200"
            >
              Receive
            </Link>
            <button
              disabled
              className="rounded-lg bg-gray-100 py-3 font-semibold text-gray-400"
              title="Send and swap coming in the next issues"
            >
              Send
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow-lg">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">Your Stellar address</h2>
          <div className="break-all rounded-lg bg-gray-100 p-3 text-sm font-mono text-gray-700">
            {data.stellarAddress}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Share this address to receive USDC or XLM from any Stellar wallet.
          </p>
        </div>
      </div>
    </main>
  );
}
