import {
  expenseDateRange,
  hasSecondaryExpenseFilters,
  parseExpenseFilterParams,
  serializeExpenseFilters
} from './expenses.component';
import { formatExpenseDate } from '../core/transaction-date';
import * as ExpensesFeature from './expenses.component';

describe('expense filter disclosure', () => {
  it('describes every active expense filter with its localized effective value', () => {
    const summary = (ExpensesFeature as unknown as {
      expenseActiveFilterSummary?: (filters: Record<string, string>, context: {
        language: 'es' | 'en';
        categories: Array<{ id: string; parentId?: string; name: string; nameEs?: string; nameEn?: string }>;
        bankOptions: Array<{ id: string; name: string }>;
        paymentMethodOptions: Array<{ id: string; name: string }>;
        t: (key: string) => string;
      }) => Array<{ label: string; value: string }>;
    }).expenseActiveFilterSummary;

    expect(summary).withContext('the UI needs a pure source of truth for the active-filter summary').toEqual(jasmine.any(Function));
    expect(summary?.({
      from: '2026-09-01',
      to: '2026-09-30',
      concept: 'Netflix',
      categoryId: 'other',
      subcategoryId: 'subscriptions',
      currency: 'clp',
      bankOptionId: 'bank-1',
      paymentMethodOptionId: 'card-1',
      paymentMethodKind: 'card'
    }, {
      language: 'es',
      categories: [
        { id: 'other', name: 'Other', nameEs: 'Otros' },
        { id: 'subscriptions', parentId: 'other', name: 'Subscriptions', nameEs: 'Suscripciones' }
      ],
      bankOptions: [{ id: 'bank-1', name: 'Banco largo' }],
      paymentMethodOptions: [{ id: 'card-1', name: 'Visa principal' }],
      t: (key) => ({
        expenses_period: 'Período',
        expenses_concept: 'Concepto',
        expenses_category: 'Categoría',
        expenses_currency: 'Moneda',
        expenses_bank: 'Banco',
        expenses_payment_option: 'Medio de pago',
        expenses_payment_method_kind: 'Tipo de medio de pago',
        expenses_card: 'Tarjeta'
      }[key] ?? key)
    })).toEqual([
      { label: 'Período', value: '2026-09-01 — 2026-09-30' },
      { label: 'Concepto', value: 'Netflix' },
      { label: 'Categoría', value: 'Otros / Suscripciones' },
      { label: 'Moneda', value: 'CLP' },
      { label: 'Banco', value: 'Banco largo' },
      { label: 'Medio de pago', value: 'Visa principal' },
      { label: 'Tipo de medio de pago', value: 'Tarjeta' }
    ]);
  });

  it('renders an installment date in UTC so a September boundary never appears as August in Chile', () => {
    expect(formatExpenseDate('2026-09-01T00:00:00.000Z', 'es')).toBe('1 sept 2026');
  });

  it('uses UTC month boundaries so filters match dashboard report totals in every browser timezone', () => {
    expect(expenseDateRange('2026-09-01', '2026-09-30')).toEqual({
      from: '2026-09-01T00:00:00.000Z',
      to: '2026-09-30T23:59:59.999Z'
    });
  });

  it('identifies active secondary filters without treating the period as secondary', () => {
    expect(hasSecondaryExpenseFilters({ concept: '', categoryId: '', subcategoryId: '', paymentMethodOptionId: '', bankOptionId: '', currency: '', paymentMethodKind: '' })).toBeFalse();
    expect(hasSecondaryExpenseFilters({ concept: '', categoryId: 'food', subcategoryId: '', paymentMethodOptionId: '', bankOptionId: '', currency: '', paymentMethodKind: '' })).toBeTrue();
    expect(hasSecondaryExpenseFilters({ concept: '', categoryId: '', subcategoryId: '', paymentMethodOptionId: '', bankOptionId: '', currency: 'CLP', paymentMethodKind: '' })).toBeTrue();
    expect(hasSecondaryExpenseFilters({ concept: 'netflix', categoryId: '', subcategoryId: '', paymentMethodOptionId: '', bankOptionId: '', currency: '', paymentMethodKind: '' })).toBeTrue();
  });

  it('accepts only safe deep-linked financial filters and serializes their canonical form', () => {
    expect(parseExpenseFilterParams({
      month: '2026-09',
      concept: 'Netflix',
      categoryId: 'food-2026',
      subcategoryId: 'subscriptions',
      paymentMethodOptionId: 'visa-card',
      bankOptionId: 'banco-largo',
      currency: 'clp',
      paymentMethodKind: 'card'
    })).toEqual({
      month: '2026-09',
      concept: 'Netflix',
      categoryId: 'food-2026',
      subcategoryId: 'subscriptions',
      paymentMethodOptionId: 'visa-card',
      bankOptionId: 'banco-largo',
      currency: 'CLP',
      paymentMethodKind: 'card'
    });

    expect(parseExpenseFilterParams({ month: '2026-19', categoryId: '<script>', currency: 'CLPX', paymentMethodKind: 'wire' })).toEqual({});
    expect(serializeExpenseFilters({ month: '2026-09', concept: 'Netflix', categoryId: 'food-2026', subcategoryId: 'subscriptions', paymentMethodOptionId: 'visa-card', bankOptionId: 'banco-largo', currency: 'CLP', paymentMethodKind: 'card' })).toEqual({
      month: '2026-09',
      concept: 'Netflix',
      categoryId: 'food-2026',
      subcategoryId: 'subscriptions',
      paymentMethodOptionId: 'visa-card',
      bankOptionId: 'banco-largo',
      currency: 'CLP',
      paymentMethodKind: 'card'
    });
    expect(serializeExpenseFilters({ month: '2026-09', categoryId: '', currency: '', paymentMethodKind: '' })).toEqual({ month: '2026-09' });
  });
});
