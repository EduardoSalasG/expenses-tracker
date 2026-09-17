import type { Category } from '../core/api.service';
import { DashboardComponent, memberPeriodBalanceState, recentExpenseFilters, rangeFromMonth } from './dashboard.component';
import { I18nService } from '../core/i18n.service';

describe('memberPeriodBalanceState', () => {
  it('classifies positive, negative, and settled member balances', () => {
    expect(memberPeriodBalanceState(9000)).toBe('credit');
    expect(memberPeriodBalanceState(-9000)).toBe('debt');
    expect(memberPeriodBalanceState(0)).toBe('settled');
  });
});

describe('DashboardComponent category labels', () => {
  it('translates a system category through the component translation method', () => {
    const i18n = new I18nService();
    i18n.setLanguage('es');
    const category: Category = {
      id: 'food',
      tenantId: 'system',
      name: 'Food',
      nameEs: 'Comida',
      nameEn: 'Food',
      isDefault: true
    };
    const component: {
      categories: () => Category[];
      i18n: I18nService;
      t(this: { i18n: I18nService }, key: string): string;
    } = {
      categories: () => [category],
      i18n,
      t(key: string) {
        return this.i18n.t(key);
      }
    };

    expect(DashboardComponent.prototype.categoryName.call(component as unknown as DashboardComponent, category.id)).toBe('Comida');
  });

  it('derives localized textual rows from the same chart totals, including an empty state', () => {
    const i18n = new I18nService();
    i18n.setLanguage('es');
    const component = {
      i18n,
      categoryTotals: () => [{ categoryId: 'food', subcategoryId: 'groceries', currency: 'CLP', total: 12500 }],
      selectedCategoryId: () => 'food',
      periodTotals: () => [],
      upcomingInstallments: () => [],
      memberPeriodSpending: () => [],
      categoryName: () => 'Comida',
      subcategoryName: () => 'Supermercado',
      formatMoney: (_currency: string, amount: number) => `$${amount.toLocaleString('es-CL')}`,
      t(key: string) { return this.i18n.t(key); }
    };

    expect(DashboardComponent.prototype.categoryChartRows.call(component as unknown as DashboardComponent)).toEqual([
      { label: 'Comida (CLP)', value: '$12.500' }
    ]);
    expect(DashboardComponent.prototype.subcategoryChartRows.call(component as unknown as DashboardComponent)).toEqual([
      { label: 'Supermercado (CLP)', value: '$12.500' }
    ]);
    expect(DashboardComponent.prototype.periodChartRows.call(component as unknown as DashboardComponent)).toEqual([]);
    expect(DashboardComponent.prototype.installmentChartRows.call(component as unknown as DashboardComponent)).toEqual([]);
    expect(DashboardComponent.prototype.memberChartRows.call(component as unknown as DashboardComponent)).toEqual([]);
  });

  it('limits recent expenses to the selected period', () => {
    expect(recentExpenseFilters(rangeFromMonth('2026-09'))).toEqual({
      from: '2026-09-01T00:00:00.000Z',
      to: '2026-09-30T23:59:59.000Z',
      limit: 5
    });
  });
});
