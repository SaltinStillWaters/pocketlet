import { describe, it, expect } from 'vitest';
import { amountToBaseUnits, calculateMinBuyAmount } from './invoke';

describe('amountToBaseUnits', () => {
  it('converts an integer amount', () => {
    expect(amountToBaseUnits('10')).toBe(100_000_000n);
  });

  it('converts a decimal amount', () => {
    expect(amountToBaseUnits('1.5')).toBe(15_000_000n);
  });

  it('pads fractional decimals', () => {
    expect(amountToBaseUnits('0.1')).toBe(1_000_000n);
  });

  it('truncates excess decimals to 7 places', () => {
    expect(amountToBaseUnits('1.123456789')).toBe(11_234_567n);
  });

  it('handles leading-zero integer part', () => {
    expect(amountToBaseUnits('0.0000001')).toBe(1n);
  });
});

describe('calculateMinBuyAmount', () => {
  it('returns the full amount with zero slippage', () => {
    expect(calculateMinBuyAmount(100_000_000n, 0)).toBe(100_000_000n);
  });

  it('applies 1% slippage', () => {
    expect(calculateMinBuyAmount(100_000_000n, 100)).toBe(99_000_000n);
  });

  it('applies 0.5% slippage', () => {
    expect(calculateMinBuyAmount(100_000_000n, 50)).toBe(99_500_000n);
  });
});
