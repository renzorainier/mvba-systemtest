import { describe, expect, it } from 'vitest';
import { calculateTotalFromBreakdown } from '@/models/SystemSettings';

describe('SystemSettings helpers', () => {
  it('calculates totals from amounts and line items', () => {
    expect(calculateTotalFromBreakdown([
      { label: 'A', amount: 100 },
      { label: 'B', totalBaseCost: 200 },
      { label: 'C', amount: 0, lineItems: [{ amount: 50 }, { amount: '25' }] },
      { label: 'D', amount: -1 },
    ])).toBe(375);
  });
});
