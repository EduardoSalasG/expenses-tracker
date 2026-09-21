import {
  expenseDateRange,
  hasSecondaryExpenseFilters,
  parseExpenseFilterParams,
  serializeExpenseFilters
} from './expenses.component';

describe('expense filter disclosure', () => {
  it('uses UTC month boundaries so filters match dashboard report totals in every browser timezone', () => {
    expect(expenseDateRange('2026-09-01', '2026-09-30')).toEqual({
      from: '2026-09-01T00:00:00.000Z',
      to: '2026-09-30T23:59:59.999Z'
    });
  });

  it('identifies active secondary filters without treating the period as secondary', () => {
    expect(hasSecondaryExpenseFilters({ categoryId: '', currency: '', paymentMethodKind: '' })).toBeFalse();
    expect(hasSecondaryExpenseFilters({ categoryId: 'food', currency: '', paymentMethodKind: '' })).toBeTrue();
    expect(hasSecondaryExpenseFilters({ categoryId: '', currency: 'CLP', paymentMethodKind: '' })).toBeTrue();
    expect(hasSecondaryExpenseFilters({ categoryId: '', currency: '', paymentMethodKind: 'card' })).toBeTrue();
  });

  it('accepts only safe deep-linked financial filters and serializes their canonical form', () => {
    expect(parseExpenseFilterParams({
      month: '2026-09',
      categoryId: 'food-2026',
      currency: 'clp',
      paymentMethodKind: 'card'
    })).toEqual({
      month: '2026-09',
      categoryId: 'food-2026',
      currency: 'CLP',
      paymentMethodKind: 'card'
    });

    expect(parseExpenseFilterParams({ month: '2026-19', categoryId: '<script>', currency: 'CLPX', paymentMethodKind: 'wire' })).toEqual({});
    expect(serializeExpenseFilters({ month: '2026-09', categoryId: 'food-2026', currency: 'CLP', paymentMethodKind: 'card' })).toEqual({
      month: '2026-09',
      categoryId: 'food-2026',
      currency: 'CLP',
      paymentMethodKind: 'card'
    });
    expect(serializeExpenseFilters({ month: '2026-09', categoryId: '', currency: '', paymentMethodKind: '' })).toEqual({ month: '2026-09' });
  });
});
