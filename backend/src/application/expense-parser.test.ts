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

  it('understands Chilean thousands separators and transfer phrases', () => {
    const parsed = parseExpenseMessage('20.000 clases de bachata bsoul mayo, transferencia desde bci', 'CLP');

    expect(parsed.status).toBe('ready');
    expect(parsed.amount).toBe(20000);
    expect(parsed.currency).toBe('CLP');
    expect(parsed.concept).toBe('clases de bachata bsoul mayo');
    expect(parsed.paymentMethod).toEqual({ kind: 'transfer', bank: 'bci' });
  });

  it('understands credit card shorthand', () => {
    const parsed = parseExpenseMessage('25.000 polera paris, tdc bci', 'CLP');

    expect(parsed.status).toBe('ready');
    expect(parsed.amount).toBe(25000);
    expect(parsed.concept).toBe('polera paris');
    expect(parsed.paymentMethod).toEqual({ kind: 'card', cardType: 'credit', bank: 'bci' });
  });

  it('understands card and bank acronyms beyond the exact catalog names', () => {
    const credit = parseExpenseMessage('25.000 polera paris, tc bancoestado', 'CLP');
    const debit = parseExpenseMessage('18.000 uber, td be', 'CLP');

    expect(credit.paymentMethod).toEqual({ kind: 'card', cardType: 'credit', bank: 'bancoestado' });
    expect(debit.paymentMethod).toEqual({ kind: 'card', cardType: 'debit', bank: 'be' });
  });

  it('does not infer currency from the tail of Spanish words', () => {
    const parsed = parseExpenseMessage('Ingreso de sueldo 1200000 Bci transferencia', 'CLP');

    expect(parsed.amount).toBe(1200000);
    expect(parsed.currency).toBe('CLP');
  });

  it('extracts installment count from natural language', () => {
    const parsed = parseExpenseMessage('500000 iphone 15, tdc bci, 3 cuotas', 'CLP');

    expect(parsed.status).toBe('ready');
    expect(parsed.amount).toBe(500000);
    expect(parsed.installmentCount).toBe(3);
    expect(parsed.concept).toBe('iphone 15');
    expect(parsed.paymentMethod).toEqual({ kind: 'card', cardType: 'credit', bank: 'bci' });
  });

  it('requires missing fields before saving', () => {
    const parsed = parseExpenseMessage('lunch', 'USD');

    expect(parsed.status).toBe('needs_confirmation');
    expect(parsed.missingFields).toContain('amount');
    expect(parsed.missingFields).toContain('paymentMethod');
  });
});
