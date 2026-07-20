'use client';

import { useState } from 'react';
import Link from 'next/link';
import PinModal from '@/components/PinModal';

type SwapDirection = 'USDC_TO_XLM' | 'XLM_TO_USDC';

interface SwapForm {
  direction: SwapDirection;
  amount: string;
  slippageBps: number;
}

interface SwapResult {
  hash: string;
}

export default function SwapPage() {
  const [form, setForm] = useState<SwapForm>({
    direction: 'USDC_TO_XLM',
    amount: '',
    slippageBps: 100,
  });
  const [step, setStep] = useState<'form' | 'review' | 'confirming' | 'success'>('form');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SwapResult | null>(null);
  const [pinModalOpen, setPinModalOpen] = useState(false);

  const sellAsset = form.direction === 'USDC_TO_XLM' ? 'USDC' : 'XLM';
  const buyAsset = form.direction === 'USDC_TO_XLM' ? 'XLM' : 'USDC';

  const validateForm = (): string | null => {
    if (!form.amount || Number.isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      return 'Enter a valid amount greater than zero';
    }
    const parts = form.amount.split('.');
    if (parts[1] && parts[1].length > 7) {
      return 'Amount cannot have more than 7 decimal places';
    }
    return null;
  };

  const submitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    setStep('review');
  };

  const confirmSwap = () => {
    setPinModalOpen(true);
  };

  const executeSwap = async (pin: string) => {
    setPinModalOpen(false);
    setStep('confirming');
    setError(null);

    try {
      const res = await fetch('/api/wallet/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          direction: form.direction,
          amount: form.amount,
          slippageBps: form.slippageBps,
          pin,
        }),
      });

      const body = (await res.json()) as { error?: string; hash?: string };
      if (!res.ok) {
        setError(body.error ?? 'Swap failed');
        setStep('review');
        return;
      }

      setResult({ hash: body.hash ?? '' });
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Swap failed');
      setStep('review');
    }
  };

  const formatAmount = () => {
    const num = Number(form.amount);
    if (Number.isNaN(num)) return form.amount;
    return num.toLocaleString(undefined, { maximumFractionDigits: 7 });
  };

  const estimatedOutput = () => {
    // The mock DEX is 1:1. A real integration would fetch a quote from the DEX.
    const num = Number(form.amount);
    if (Number.isNaN(num)) return '—';
    return formatAmount();
  };

  if (step === 'success' && result) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-md">
          <div className="mb-6 flex items-center justify-between">
            <Link href="/home" className="text-2xl font-bold text-pocketlet-600">
              ← Pocketlet
            </Link>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-lg text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-600">
              ✓
            </div>
            <h1 className="mb-2 text-xl font-semibold text-gray-900">Swap complete</h1>
            <p className="mb-4 text-sm text-gray-600">
              Swapped {formatAmount()} {sellAsset} for {estimatedOutput()} {buyAsset}.
            </p>
            <div className="mb-4 rounded-lg bg-gray-100 p-3">
              <p className="text-xs text-gray-500">Transaction hash</p>
              <p className="break-all text-xs font-mono text-gray-700">{result.hash}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href={`/transactions/${result.hash}`}
                className="rounded-lg bg-pocketlet-100 py-2.5 text-center font-semibold text-pocketlet-700 hover:bg-pocketlet-200"
              >
                View details
              </Link>
              <Link
                href="/home"
                className="rounded-lg bg-pocketlet-600 py-2.5 text-center font-semibold text-white hover:bg-pocketlet-700"
              >
                Done
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/home" className="text-2xl font-bold text-pocketlet-600">
            ← Pocketlet
          </Link>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-lg">
          <h1 className="mb-4 text-xl font-semibold text-gray-900">Swap</h1>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          {step === 'form' && (
            <form onSubmit={submitForm} className="space-y-4">
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Sell</span>
                  <span className="font-semibold text-gray-900">{sellAsset}</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      direction:
                        f.direction === 'USDC_TO_XLM' ? 'XLM_TO_USDC' : 'USDC_TO_XLM',
                    }))
                  }
                  className="w-full rounded-lg bg-white py-2 text-center text-sm font-semibold text-pocketlet-600 shadow-sm hover:bg-gray-50"
                >
                  ⇅ Flip direction
                </button>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Buy</span>
                  <span className="font-semibold text-gray-900">{buyAsset}</span>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Amount to sell
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      amount: e.target.value.replace(/[^0-9.]/g, ''),
                    }))
                  }
                  placeholder="0.00"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-pocketlet-500 focus:outline-none focus:ring-2 focus:ring-pocketlet-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Max slippage ({(form.slippageBps / 100).toFixed(0)}%)
                </label>
                <input
                  type="range"
                  min={0}
                  max={500}
                  step={10}
                  value={form.slippageBps}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, slippageBps: Number(e.target.value) }))
                  }
                  className="w-full"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Your swap will not execute if the price moves more than this
                  against you.
                </p>
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-pocketlet-600 py-3 font-semibold text-white hover:bg-pocketlet-700"
              >
                Review
              </button>
            </form>
          )}

          {step === 'review' && (
            <div className="space-y-4">
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="mb-3 flex justify-between">
                  <span className="text-sm text-gray-500">Sell</span>
                  <span className="font-medium text-gray-900">
                    {formatAmount()} {sellAsset}
                  </span>
                </div>
                <div className="mb-3 flex justify-between">
                  <span className="text-sm text-gray-500">Buy (estimated)</span>
                  <span className="font-medium text-gray-900">
                    {estimatedOutput()} {buyAsset}
                  </span>
                </div>
                <div className="mb-3 flex justify-between">
                  <span className="text-sm text-gray-500">Max slippage</span>
                  <span className="font-medium text-gray-900">
                    {(form.slippageBps / 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Network fee</span>
                  <span className="font-medium text-gray-900">~0.001 XLM</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setStep('form')}
                  className="rounded-lg bg-gray-100 py-3 font-semibold text-gray-700 hover:bg-gray-200"
                >
                  Back
                </button>
                <button
                  onClick={confirmSwap}
                  className="rounded-lg bg-pocketlet-600 py-3 font-semibold text-white hover:bg-pocketlet-700"
                >
                  Confirm
                </button>
              </div>
            </div>
          )}

          {step === 'confirming' && (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-pocketlet-200 border-t-pocketlet-600"></div>
              <p className="text-gray-600">Submitting to Stellar testnet...</p>
            </div>
          )}
        </div>
      </div>

      <PinModal
        isOpen={pinModalOpen}
        title="Confirm swap"
        onConfirm={executeSwap}
        onCancel={() => {
          setPinModalOpen(false);
          setStep('review');
        }}
      />
    </main>
  );
}
