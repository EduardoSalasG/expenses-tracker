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
    const [expenses, incomes] = await Promise.all([
      this.expenses.listByPeriod(tenantId, from, to),
      this.incomes.listByPeriod(tenantId, from, to)
    ]);

    return {
      from,
      to,
      expenses,
      incomes,
      expenseTotalsByCurrency: totalsByCurrency(expenses),
      incomeTotalsByCurrency: totalsByCurrency(incomes)
    };
  }
}
