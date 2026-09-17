import { hasSecondaryExpenseFilters } from './expenses.component';

describe('expense filter disclosure', () => {
  it('identifies active secondary filters without treating the period as secondary', () => {
    expect(hasSecondaryExpenseFilters({ categoryId: '', currency: '', paymentMethodKind: '' })).toBeFalse();
    expect(hasSecondaryExpenseFilters({ categoryId: 'food', currency: '', paymentMethodKind: '' })).toBeTrue();
    expect(hasSecondaryExpenseFilters({ categoryId: '', currency: 'CLP', paymentMethodKind: '' })).toBeTrue();
    expect(hasSecondaryExpenseFilters({ categoryId: '', currency: '', paymentMethodKind: 'card' })).toBeTrue();
  });
});
