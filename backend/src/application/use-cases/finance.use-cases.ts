import type { BankOption, Category, Expense, Income, MonthlyBudget, PaymentMethodOption } from '../../domain/index.js';
import type { BankOptionRepository, BudgetRepository, CategoryRepository, ExpenseRepository, IncomeRepository, PaymentMethodOptionRepository } from '../ports.js';
import { normalizeCategorySelection } from '../services/category-normalization.service.js';
import { totalsByCurrency } from '../services/reporting.service.js';

export class FinanceUseCases {
  constructor(
    private readonly expenses: ExpenseRepository,
    private readonly incomes: IncomeRepository,
    private readonly budgets: BudgetRepository,
    private readonly categories: CategoryRepository,
    private readonly banks: BankOptionRepository = {
      listByTenant: async () => [],
      findAccessibleById: async () => undefined,
      create: async () => { throw new Error('Bank options repository not configured.'); },
      update: async () => undefined,
      delete: async () => false
    },
    private readonly paymentMethods: PaymentMethodOptionRepository = {
      listByTenant: async () => [],
      findAccessibleById: async () => undefined,
      create: async () => { throw new Error('Payment method options repository not configured.'); },
      update: async () => undefined,
      delete: async () => false
    }
  ) {}

  async createExpense(input: Omit<Expense, 'id'> & { paymentMethodOptionId?: string; bankOptionId?: string }) {
    const categories = await this.categories.listByTenant(input.tenantId);
    const normalized = normalizeCategorySelection(categories, input.categoryId, input.subcategoryId);
    const paymentSelection = await this.resolvePaymentSelection(input.tenantId, input);
    return this.expenses.create({
      ...input,
      categoryId: normalized.categoryId,
      subcategoryId: normalized.subcategoryId,
      paymentMethod: paymentSelection.paymentMethod,
      paymentMethodOptionId: paymentSelection.paymentMethodOptionId,
      bankOptionId: paymentSelection.bankOptionId
    });
  }

  async updateExpense(input: {
    tenantId: string;
    expenseId: string;
    date: string;
    amount: number;
    currency: string;
    concept: string;
    categoryId: string;
    subcategoryId?: string;
    paymentMethodOptionId?: string;
    bankOptionId?: string;
    paymentMethod: Expense['paymentMethod'];
  }) {
    const categories = await this.categories.listByTenant(input.tenantId);
    const normalized = normalizeCategorySelection(categories, input.categoryId, input.subcategoryId);
    const paymentSelection = await this.resolvePaymentSelection(input.tenantId, input);
    const updated = await this.expenses.update({
      tenantId: input.tenantId,
      expenseId: input.expenseId,
      date: input.date,
      amount: input.amount,
      currency: input.currency,
      concept: input.concept,
      categoryId: normalized.categoryId,
      subcategoryId: normalized.subcategoryId,
      paymentMethod: paymentSelection.paymentMethod,
      paymentMethodOptionId: paymentSelection.paymentMethodOptionId,
      bankOptionId: paymentSelection.bankOptionId
    });
    if (!updated) throw new Error('Expense not found.');
    return updated;
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

  async updateIncome(input: {
    tenantId: string;
    incomeId: string;
    date: string;
    amount: number;
    currency: string;
    concept: string;
  }) {
    const updated = await this.incomes.update(input);
    if (!updated) throw new Error('Income not found.');
    return updated;
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

  listBankOptions(tenantId: string) {
    return this.banks.listByTenant(tenantId);
  }

  createBankOption(input: Omit<BankOption, 'id'>) {
    return this.banks.create(input);
  }

  async updateBankOption(input: { tenantId: string; bankOptionId: string; name: string }) {
    const option = await this.banks.findAccessibleById(input.tenantId, input.bankOptionId);
    if (!option) throw new Error('Bank option not found.');
    if (option.isDefault || option.tenantId !== input.tenantId) throw new Error('Default bank options cannot be modified.');
    const updated = await this.banks.update(input);
    if (!updated) throw new Error('Bank option not found.');
    return updated;
  }

  async deleteBankOption(input: { tenantId: string; bankOptionId: string }) {
    const option = await this.banks.findAccessibleById(input.tenantId, input.bankOptionId);
    if (!option) throw new Error('Bank option not found.');
    if (option.isDefault || option.tenantId !== input.tenantId) throw new Error('Default bank options cannot be deleted.');
    const deleted = await this.banks.delete(input);
    if (!deleted) throw new Error('Bank option not found.');
    return { deleted: true };
  }

  listPaymentMethodOptions(tenantId: string) {
    return this.paymentMethods.listByTenant(tenantId);
  }

  createPaymentMethodOption(input: Omit<PaymentMethodOption, 'id' | 'code'>) {
    return this.paymentMethods.create({
      ...input,
      code: slugifyPaymentMethodCode(input.name)
    });
  }

  async updatePaymentMethodOption(input: {
    tenantId: string;
    paymentMethodOptionId: string;
    name: string;
    kind: PaymentMethodOption['kind'];
    cardType?: PaymentMethodOption['cardType'];
  }) {
    const option = await this.paymentMethods.findAccessibleById(input.tenantId, input.paymentMethodOptionId);
    if (!option) throw new Error('Payment method option not found.');
    if (option.isDefault || option.tenantId !== input.tenantId) throw new Error('Default payment method options cannot be modified.');
    const updated = await this.paymentMethods.update({
      ...input,
      code: slugifyPaymentMethodCode(input.name)
    });
    if (!updated) throw new Error('Payment method option not found.');
    return updated;
  }

  async deletePaymentMethodOption(input: { tenantId: string; paymentMethodOptionId: string }) {
    const option = await this.paymentMethods.findAccessibleById(input.tenantId, input.paymentMethodOptionId);
    if (!option) throw new Error('Payment method option not found.');
    if (option.isDefault || option.tenantId !== input.tenantId) throw new Error('Default payment method options cannot be deleted.');
    const deleted = await this.paymentMethods.delete(input);
    if (!deleted) throw new Error('Payment method option not found.');
    return { deleted: true };
  }

  upsertMonthlyBudget(input: Omit<MonthlyBudget, 'id'>) {
    return this.budgets.upsertMonthly(input);
  }

  monthlyBudgets(tenantId: string) {
    return this.budgets.listMonthly(tenantId);
  }

  async report(tenantId: string, from: string, to: string) {
    const { previousFrom, previousTo } = previousPeriod(from, to);
    const [expenses, incomes, categories, currentCategoryTotals, previousCategoryTotals] = await Promise.all([
      this.expenses.listByPeriod(tenantId, from, to),
      this.incomes.listByPeriod(tenantId, from, to),
      this.categories.listByTenant(tenantId),
      this.expenses.periodCategoryTotalsByTenant(tenantId, from, to),
      this.expenses.periodCategoryTotalsByTenant(tenantId, previousFrom, previousTo)
    ]);

    return {
      from,
      to,
      expenses,
      incomes,
      expenseTotalsByCurrency: totalsByCurrency(expenses),
      incomeTotalsByCurrency: totalsByCurrency(incomes),
      expenseVariationByCategory: categoryExpenseVariation(currentCategoryTotals, previousCategoryTotals, categories)
    };
  }

  yearlyExpensesMonthlyTotals(tenantId: string, year: number) {
    return this.expenses.yearlyMonthlyTotalsByTenant(tenantId, year);
  }

  monthlyExpensesDailyTotals(tenantId: string, month: string) {
    return this.expenses.monthlyDailyTotalsByTenant(tenantId, month);
  }

  weeklyExpensesDailyTotals(tenantId: string, weekStartIsoDate: string) {
    return this.expenses.weeklyDailyTotalsByTenant(tenantId, weekStartIsoDate);
  }

  yearlyIncomesMonthlyTotals(tenantId: string, year: number) {
    return this.incomes.yearlyMonthlyTotalsByTenant(tenantId, year);
  }

  monthlyIncomesDailyTotals(tenantId: string, month: string) {
    return this.incomes.monthlyDailyTotalsByTenant(tenantId, month);
  }

  periodExpenseCategoryTotals(tenantId: string, from: string, to: string) {
    return this.expenses.periodCategoryTotalsByTenant(tenantId, from, to);
  }

  private async resolvePaymentSelection(
    tenantId: string,
    input: { paymentMethod: Expense['paymentMethod']; paymentMethodOptionId?: string; bankOptionId?: string }
  ) {
    let paymentMethod = input.paymentMethod;
    let paymentMethodOptionId = input.paymentMethodOptionId;
    let bankOptionId = input.bankOptionId;

    if (paymentMethodOptionId) {
      const option = await this.paymentMethods.findAccessibleById(tenantId, paymentMethodOptionId);
      if (!option) throw new Error('Payment method option not found.');
      paymentMethod = {
        kind: option.kind,
        cardType: option.cardType,
        bank: paymentMethod.bank
      };
    }

    if (bankOptionId) {
      const bank = await this.banks.findAccessibleById(tenantId, bankOptionId);
      if (!bank) throw new Error('Bank option not found.');
      paymentMethod = {
        ...paymentMethod,
        bank: bank.name
      };
    } else if (paymentMethod.kind === 'cash') {
      bankOptionId = undefined;
      paymentMethod = { kind: 'cash' };
    }

    return {
      paymentMethod,
      paymentMethodOptionId,
      bankOptionId
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
  currentTotals: Array<{ categoryId: string; currency: string; total: number }>,
  previousTotals: Array<{ categoryId: string; currency: string; total: number }>,
  categories: Category[]
) {
  const current = aggregateCategoryCurrency(currentTotals);
  const previous = aggregateCategoryCurrency(previousTotals);
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

function aggregateCategoryCurrency(totals: Array<{ categoryId: string; currency: string; total: number }>) {
  return totals.reduce<Record<string, number>>((acc, item) => {
    const key = `${item.categoryId}__${item.currency}`;
    acc[key] = (acc[key] ?? 0) + Number(item.total);
    return acc;
  }, {});
}

function slugifyPaymentMethodCode(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50) || 'custom_method';
}
