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

  it('extracts a named first installment date without adding it to the concept', () => {
    const parsed = parseExpenseMessage(
      '500000 refrigerador, tdc bci, 3 cuotas, primera cuota el 5 de septiembre de 2026',
      'CLP',
      new Date('2026-05-06T00:00:00.000Z')
    );

    expect(parsed.firstInstallmentDate).toBe('2026-09-05');
    expect(parsed.date).toBe('2026-05-06');
    expect(parsed.concept).toBe('refrigerador');
  });

  it('keeps an explicit purchase date separate from the first installment date', () => {
    const parsed = parseExpenseMessage(
      '500000 refrigerador, tdc bci, 3 cuotas, 2026-05-02, primera cuota el 5 de septiembre de 2026',
      'CLP',
      new Date('2026-05-06T00:00:00.000Z')
    );

    expect(parsed.date).toBe('2026-05-02');
    expect(parsed.firstInstallmentDate).toBe('2026-09-05');
  });

  it('extracts an expense date and removes it from the concept', () => {
    const parsed = parseExpenseMessage(
      '12.500 supermercado con débito BancoEstado ayer',
      'CLP',
      new Date('2026-10-23T12:00:00.000Z')
    );

    expect(parsed.status).toBe('ready');
    expect(parsed.date).toBe('2026-10-22');
    expect(parsed.concept).toBe('supermercado');
    expect(parsed.paymentMethod).toEqual({ kind: 'card', cardType: 'debit', bank: 'bancoestado' });
  });

  it('uses today when the expense date is omitted', () => {
    const parsed = parseExpenseMessage('2.500 pan en efectivo', 'CLP', new Date('2026-10-23T12:00:00.000Z'));

    expect(parsed.date).toBe('2026-10-23');
  });

  it('requests clarification for an invalid explicit expense date', () => {
    const parsed = parseExpenseMessage('2.500 pan en efectivo el 31 de febrero', 'CLP');

    expect(parsed.status).toBe('needs_confirmation');
    expect(parsed.missingFields).toContain('date');
  });

  it('requires a bank for card or transfer expenses', () => {
    const parsed = parseExpenseMessage('3.200 café con crédito', 'CLP');

    expect(parsed.status).toBe('needs_confirmation');
    expect(parsed.missingFields).toContain('bank');
  });

  it('requires missing fields before saving', () => {
    const parsed = parseExpenseMessage('lunch', 'USD');

    expect(parsed.status).toBe('needs_confirmation');
    expect(parsed.missingFields).toContain('amount');
    expect(parsed.missingFields).toContain('paymentMethod');
  });
});
