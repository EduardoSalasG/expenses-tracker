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
      categoryTotals: () => [
        { categoryId: 'food', subcategoryId: 'groceries', currency: 'CLP', total: 12500 },
        { categoryId: 'food', subcategoryId: 'restaurants', currency: 'CLP', total: 2500 }
      ],
      selectedCategoryId: () => 'food',
      periodTotals: () => [],
      upcomingInstallments: () => [],
      memberPeriodSpending: () => [],
      categoryName: () => 'Comida',
      subcategoryName: (subcategoryId?: string) => subcategoryId === 'restaurants' ? 'Restaurantes' : 'Supermercado',
      formatMoney: (_currency: string, amount: number) => `$${amount.toLocaleString('es-CL')}`,
      report: () => ({
        incomeTotalsByCurrency: { CLP: 24000 },
        expenseTotalsByCurrency: { CLP: 15000 }
      }),
      categoryChartTotals: DashboardComponent.prototype['categoryChartTotals'],
      t(key: string) { return this.i18n.t(key); }
    };

    expect(DashboardComponent.prototype.categoryChartRows.call(component as unknown as DashboardComponent)).toEqual([
      { label: 'Comida (CLP)', value: '$15.000' }
    ]);
    expect(DashboardComponent.prototype.currencyChartRows.call(component as unknown as DashboardComponent)).toEqual([
      { label: 'CLP', value: 'Ingresos: $24.000 · Gastos: $15.000' }
    ]);
    expect(DashboardComponent.prototype.subcategoryChartRows.call(component as unknown as DashboardComponent)).toEqual([
      { label: 'Supermercado (CLP)', value: '$12.500' },
      { label: 'Restaurantes (CLP)', value: '$2.500' }
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
