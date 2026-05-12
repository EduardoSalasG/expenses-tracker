import type { Category, Expense, Income, MonthlyBudget } from '../../domain/index.js';
import type { BudgetRepository, CategoryRepository, ExpenseRepository, IncomeRepository } from '../ports.js';
import { totalsByCurrency } from '../services/reporting.service.js';

export class FinanceUseCases {
  constructor(
    private readonly expenses: ExpenseRepository,
    private readonly incomes: IncomeRepository,
    private readonly budgets: BudgetRepository,
    private readonly categories: CategoryRepository
  ) {}

  createExpense(input: Omit<Expense, 'id'>) {
    return this.expenses.create(input);
  }

  listExpenses(input: {
    tenantId: string;
    from?: string;
    to?: string;
    categoryId?: string;
    currency?: string;
    paymentMethodKind?: 'cash' | 'card' | 'transfer';
    limit?: number;
  }) {
    return this.expenses.list({ ...input, limit: input.limit ?? 50 });
  }

  recentExpenses(tenantId: string, limit = 10) {
    return this.expenses.listRecent(tenantId, limit);
  }

  createIncome(input: Omit<Income, 'id'>) {
    return this.incomes.create(input);
  }

  listIncomes(input: {
    tenantId: string;
    from?: string;
    to?: string;
    currency?: string;
    limit?: number;
  }) {
    return this.incomes.list({ ...input, limit: input.limit ?? 50 });
  }

  listCategories(tenantId: string) {
    return this.categories.listByTenant(tenantId);
  }

  createCategory(input: Omit<Category, 'id'>) {
    return this.categories.create(input);
  }

  upsertMonthlyBudget(input: Omit<MonthlyBudget, 'id'>) {
    return this.budgets.upsertMonthly(input);
  }

  monthlyBudgets(tenantId: string, month: string) {
    return this.budgets.listMonthly(tenantId, month);
  }

  async report(tenantId: string, from: string, to: string) {
    const { previousFrom, previousTo } = previousPeriod(from, to);
    const [expenses, incomes, previousExpenses, categories] = await Promise.all([
      this.expenses.listByPeriod(tenantId, from, to),
      this.incomes.listByPeriod(tenantId, from, to),
      this.expenses.listByPeriod(tenantId, previousFrom, previousTo),
      this.categories.listByTenant(tenantId)
    ]);

    return {
      from,
      to,
      expenses,
      incomes,
      expenseTotalsByCurrency: totalsByCurrency(expenses),
      incomeTotalsByCurrency: totalsByCurrency(incomes),
      expenseVariationByCategory: categoryExpenseVariation(expenses, previousExpenses, categories)
    };
  }
}

function previousPeriod(from: string, to: string) {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const periodMs = toDate.getTime() - fromDate.getTime() + 1;
  const previousToDate = new Date(fromDate.getTime() - 1);
  const previousFromDate = new Date(previousToDate.getTime() - periodMs + 1);
  return {
    previousFrom: previousFromDate.toISOString(),
    previousTo: previousToDate.toISOString()
  };
}

function categoryExpenseVariation(
  currentExpenses: Expense[],
  previousExpenses: Expense[],
  categories: Category[]
) {
  const current = aggregateCategoryCurrency(currentExpenses);
  const previous = aggregateCategoryCurrency(previousExpenses);
  const keys = new Set([...Object.keys(current), ...Object.keys(previous)]);

  return [...keys]
    .map((key) => {
      const [categoryId, currency] = key.split('__');
      const currentTotal = current[key] ?? 0;
      const previousTotal = previous[key] ?? 0;
      const delta = currentTotal - previousTotal;
      const deltaPercent = previousTotal === 0 ? null : Number(((delta / previousTotal) * 100).toFixed(2));
      return {
        categoryId,
        categoryName: categories.find((category) => category.id === categoryId)?.name ?? 'Uncategorized',
        currency,
        currentTotal,
        previousTotal,
        delta,
        deltaPercent
      };
    })
    .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta));
}

function aggregateCategoryCurrency(expenses: Expense[]) {
  return expenses.reduce<Record<string, number>>((acc, expense) => {
    const key = `${expense.categoryId}__${expense.currency}`;
    acc[key] = (acc[key] ?? 0) + Number(expense.amount);
    return acc;
  }, {});
}
