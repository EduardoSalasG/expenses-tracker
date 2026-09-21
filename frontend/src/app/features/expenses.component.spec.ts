import {
  expenseDateRange,
  hasSecondaryExpenseFilters,
  parseExpenseFilterParams,
  serializeExpenseFilters
} from './expenses.component';
import { formatExpenseDate } from '../core/transaction-date';

describe('expense filter disclosure', () => {
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
