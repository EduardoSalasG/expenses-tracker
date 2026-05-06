import { describe, expect, it } from 'vitest';
import { parseExpenseMessage } from './expense-parser.js';

describe('parseExpenseMessage', () => {
  it('extracts amount, concept, currency, and cash payment method', () => {
    const parsed = parseExpenseMessage('CLP 12500 groceries cash', 'CLP');

    expect(parsed.status).toBe('ready');
    expect(parsed.amount).toBe(12500);
    expect(parsed.currency).toBe('CLP');
    expect(parsed.concept).toBe('groceries');
    expect(parsed.paymentMethod).toEqual({ kind: 'cash' });
  });

  it('requires missing fields before saving', () => {
    const parsed = parseExpenseMessage('lunch', 'USD');

    expect(parsed.status).toBe('needs_confirmation');
    expect(parsed.missingFields).toContain('amount');
    expect(parsed.missingFields).toContain('paymentMethod');
  });
});
