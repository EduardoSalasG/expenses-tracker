import type { Category } from '../core/api.service';
import { DashboardComponent, buildWeekLabels, monthWeekStartIsoDate, memberPeriodBalanceState, recentExpenseFilters, rangeFromMonth } from './dashboard.component';
import { I18nService } from '../core/i18n.service';
import { deriveDashboardPriorities } from './dashboard-priority';

describe('memberPeriodBalanceState', () => {
  it('classifies positive, negative, and settled member balances', () => {
    expect(memberPeriodBalanceState(9000)).toBe('credit');
    expect(memberPeriodBalanceState(-9000)).toBe('debt');
    expect(memberPeriodBalanceState(0)).toBe('settled');
  });
});

describe('monthly weekly-chart period', () => {
  it('anchors a month starting on Monday to its first complete calendar week', () => {
    expect(monthWeekStartIsoDate('2026-06')).toBe('2026-06-01');
  });

  it('keeps the complete Monday-to-Sunday week when a month starts midweek', () => {
    expect(monthWeekStartIsoDate('2026-09')).toBe('2026-08-31');
    expect(buildWeekLabels('2026-08-31', 'es-CL').map((label) => label.isoDate)).toEqual([
      '2026-08-31', '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06'
    ]);
  });

  it('labels weekly days with both the day and month so a split week is unambiguous', () => {
    const labels = buildWeekLabels('2026-08-31', 'en-US').map((label) => label.display);
    expect(labels[0]).toContain('31');
    expect(labels[0]).toMatch(/Aug/i);
    expect(labels[1]).toContain('1');
    expect(labels[1]).toMatch(/Sep/i);
  });
});

describe('deriveDashboardPriorities', () => {
  it('prioritizes a budget that has reached its limit', () => {
    expect(deriveDashboardPriorities({
      budgetProgress: [{ label: 'Comida', progress: 100 }],
      upcomingInstallments: [],
      memberBalances: []
    })).toEqual([
      jasmine.objectContaining({
        id: 'budget-comida',
        tone: 'danger',
        titleKey: 'dashboard_priority_budget_title',
        route: '/budgets'
      })
    ]);
  });

  it('includes upcoming charges and shared debts without inventing a priority for healthy data', () => {
    expect(deriveDashboardPriorities({
      budgetProgress: [{ label: 'Transporte', progress: 32 }],
      upcomingInstallments: [{ periodKey: '2026-10', currency: 'CLP', total: 19000 }],
      memberBalances: [{ userId: 'user-1', preferredName: 'Ana', currency: 'CLP', balanceAmount: -3500 }]
    })).toEqual([
      jasmine.objectContaining({ id: 'upcoming-installments', tone: 'info', route: '/expenses' }),
      jasmine.objectContaining({ id: 'shared-debt-user-1-CLP', tone: 'warning', route: '/settings', queryParams: { section: 'accounts' } })
    ]);
  });

  it('returns no priorities when all sources are healthy', () => {
    expect(deriveDashboardPriorities({ budgetProgress: [], upcomingInstallments: [], memberBalances: [] })).toEqual([]);
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
      viewMode: () => 'monthly' as const,
      selectedMonth: () => '2026-09',
      locale: () => 'es-CL',
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
