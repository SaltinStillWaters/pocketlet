import { describe, it, expect } from 'vitest';
import { amountToBaseUnits } from './invoke';

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
