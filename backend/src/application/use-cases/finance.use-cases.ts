import type { BankOption, Category, Expense, ExpenseAllocationMode, Income, MonthlyBudget, PaymentMethodOption } from '../../domain/index.js';
import type {
  BankOptionRepository,
  BudgetRepository,
  CategoryRepository,
  ExpenseRepository,
  FinancialAccountRepository,
  IncomeRepository,
  PaymentMethodOptionRepository
} from '../ports.js';
import { normalizeCategorySelection } from '../services/category-normalization.service.js';
import { PaymentSelectionService } from '../services/payment-selection.service.js';
import { totalsByCurrency } from '../services/reporting.service.js';

export class FinanceUseCases {
  private readonly paymentSelections: PaymentSelectionService;

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
    },
    private readonly financialAccounts?: FinancialAccountRepository
  ) {
    this.paymentSelections = new PaymentSelectionService(this.banks, this.paymentMethods);
  }

  async createExpense(
    input: Omit<Expense, 'id'> & {
      paymentMethodOptionId?: string;
      bankOptionId?: string;
      paidByUserId?: string;
      allocationMode?: ExpenseAllocationMode;
      allocations?: Array<{ owedByUserId: string; amount: number }>;
    }
  ) {
    const categories = await this.categories.listByTenant(input.tenantId, input.financialAccountId);
    const normalized = normalizeCategorySelection(categories, input.categoryId, input.subcategoryId);
    const paymentSelection = await this.resolvePaymentSelection(input.tenantId, input.financialAccountId, input);
    const allocationResolution = await this.resolveSharedExpenseAllocationsOnCreate(input);
    return this.expenses.create({
      ...input,
      categoryId: normalized.categoryId,
      subcategoryId: normalized.subcategoryId,
      paymentMethod: paymentSelection.paymentMethod,
      paymentMethodOptionId: paymentSelection.paymentMethodOptionId,
      bankOptionId: paymentSelection.bankOptionId,
      paidByUserId: allocationResolution.paidByUserId,
      allocationMode: allocationResolution.allocationMode,
      allocations: allocationResolution.allocations
    });
  }

  async updateExpense(input: {
    tenantId: string;
    financialAccountId?: string;
    expenseId: string;
    userId: string;
    date: string;
    amount: number;
    currency: string;
    concept: string;
    categoryId: string;
    subcategoryId?: string;
    paymentMethodOptionId?: string;
    bankOptionId?: string;
    paidByUserId?: string;
    allocationMode?: ExpenseAllocationMode;
    allocations?: Array<{ owedByUserId: string; amount: number }>;
    installmentCount?: number;
    firstInstallmentDate?: string;
    paymentMethod: Expense['paymentMethod'];
  }) {
    const existing = await this.expenses.findById({
      tenantId: input.tenantId,
      financialAccountId: input.financialAccountId,
      expenseId: input.expenseId
    });
    if (!existing) throw new Error('Expense not found.');
    const categories = await this.categories.listByTenant(input.tenantId, input.financialAccountId);
    const normalized = normalizeCategorySelection(categories, input.categoryId, input.subcategoryId);
    const paymentSelection = await this.resolvePaymentSelection(input.tenantId, input.financialAccountId, input);
    const allocationResolution = await this.resolveSharedExpenseAllocationsOnUpdate(input, existing);
    const updated = await this.expenses.update({
      tenantId: input.tenantId,
      financialAccountId: input.financialAccountId,
      expenseId: input.expenseId,
      date: input.date,
      amount: input.amount,
      currency: input.currency,
      concept: input.concept,
      categoryId: normalized.categoryId,
      subcategoryId: normalized.subcategoryId,
      paymentMethod: paymentSelection.paymentMethod,
      paymentMethodOptionId: paymentSelection.paymentMethodOptionId,
      bankOptionId: paymentSelection.bankOptionId,
      paidByUserId: allocationResolution.paidByUserId,
      allocationMode: allocationResolution.allocationMode,
      allocations: allocationResolution.allocations,
      installmentCount: input.installmentCount,
      firstInstallmentDate: input.firstInstallmentDate
    });
    if (!updated) throw new Error('Expense not found.');
    return updated;
  }

  async deleteExpense(input: { tenantId: string; financialAccountId?: string; expenseId: string }) {
    const deleted = await this.expenses.delete(input);
    if (!deleted) throw new Error('Expense not found.');
    return { deleted: true };
  }

  listExpenses(input: {
    tenantId: string;
    financialAccountId?: string;
    from?: string;
    to?: string;
    categoryId?: string;
    currency?: string;
    paymentMethodKind?: 'cash' | 'card' | 'transfer';
    limit?: number;
  }) {
    return this.expenses.list({ ...input, limit: input.limit ?? 50 });
  }

  recentExpenses(tenantId: string, financialAccountId?: string, limit = 10) {
    return this.expenses.listRecent(tenantId, financialAccountId, limit);
  }

  createIncome(input: Omit<Income, 'id'>) {
    return this.incomes.create(input);
  }

  async updateIncome(input: {
    tenantId: string;
    financialAccountId?: string;
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

  async deleteIncome(input: { tenantId: string; financialAccountId?: string; incomeId: string }) {
    const deleted = await this.incomes.delete(input);
    if (!deleted) throw new Error('Income not found.');
    return { deleted: true };
  }

  listIncomes(input: {
    tenantId: string;
    financialAccountId?: string;
    from?: string;
    to?: string;
    currency?: string;
    limit?: number;
  }) {
    return this.incomes.list({ ...input, limit: input.limit ?? 50 });
  }

  listCategories(tenantId: string, financialAccountId?: string) {
    return this.categories.listByTenant(tenantId, financialAccountId);
  }

  createCategory(input: Omit<Category, 'id'>) {
    return this.categories.create(input);
  }

  listBankOptions(tenantId: string, financialAccountId?: string) {
    return this.banks.listByTenant(tenantId, financialAccountId);
  }

  createBankOption(input: Omit<BankOption, 'id'>) {
    return this.banks.create(input);
  }

  async updateBankOption(input: { tenantId: string; financialAccountId?: string; bankOptionId: string; name: string }) {
    const option = await this.banks.findAccessibleById(input.tenantId, input.bankOptionId, input.financialAccountId);
    if (!option) throw new Error('Bank option not found.');
    if (option.isDefault || option.tenantId !== input.tenantId) throw new Error('Default bank options cannot be modified.');
    const updated = await this.banks.update(input);
    if (!updated) throw new Error('Bank option not found.');
    return updated;
  }

  async deleteBankOption(input: { tenantId: string; financialAccountId?: string; bankOptionId: string }) {
    const option = await this.banks.findAccessibleById(input.tenantId, input.bankOptionId, input.financialAccountId);
    if (!option) throw new Error('Bank option not found.');
    if (option.isDefault || option.tenantId !== input.tenantId) throw new Error('Default bank options cannot be deleted.');
    const deleted = await this.banks.delete(input);
    if (!deleted) throw new Error('Bank option not found.');
    return { deleted: true };
  }

  listPaymentMethodOptions(tenantId: string, financialAccountId?: string) {
    return this.paymentMethods.listByTenant(tenantId, financialAccountId);
  }

  createPaymentMethodOption(input: Omit<PaymentMethodOption, 'id' | 'code'>) {
    return this.paymentMethods.create({
      ...input,
      code: slugifyPaymentMethodCode(input.name)
    });
  }

  async updatePaymentMethodOption(input: {
    tenantId: string;
    financialAccountId?: string;
    paymentMethodOptionId: string;
    name: string;
    kind: PaymentMethodOption['kind'];
    cardType?: PaymentMethodOption['cardType'];
  }) {
    const option = await this.paymentMethods.findAccessibleById(input.tenantId, input.paymentMethodOptionId, input.financialAccountId);
    if (!option) throw new Error('Payment method option not found.');
    if (option.isDefault || option.tenantId !== input.tenantId) throw new Error('Default payment method options cannot be modified.');
    const updated = await this.paymentMethods.update({
      ...input,
      code: slugifyPaymentMethodCode(input.name)
    });
    if (!updated) throw new Error('Payment method option not found.');
    return updated;
  }

  async deletePaymentMethodOption(input: { tenantId: string; financialAccountId?: string; paymentMethodOptionId: string }) {
    const option = await this.paymentMethods.findAccessibleById(input.tenantId, input.paymentMethodOptionId, input.financialAccountId);
    if (!option) throw new Error('Payment method option not found.');
    if (option.isDefault || option.tenantId !== input.tenantId) throw new Error('Default payment method options cannot be deleted.');
    const deleted = await this.paymentMethods.delete(input);
    if (!deleted) throw new Error('Payment method option not found.');
    return { deleted: true };
  }

  upsertMonthlyBudget(input: Omit<MonthlyBudget, 'id'>) {
    return this.budgets.upsertMonthly(input);
  }

  monthlyBudgets(tenantId: string, financialAccountId?: string) {
    return this.budgets.listMonthly(tenantId, financialAccountId);
  }

  async report(tenantId: string, financialAccountId: string | undefined, from: string, to: string) {
    const { previousFrom, previousTo } = previousPeriod(from, to);
    const [expenses, incomes, categories, currentCategoryTotals, previousCategoryTotals] = await Promise.all([
      this.expenses.listByPeriod(tenantId, financialAccountId, from, to),
      this.incomes.listByPeriod(tenantId, financialAccountId, from, to),
      this.categories.listByTenant(tenantId, financialAccountId),
      this.expenses.periodCategoryTotalsByTenant(tenantId, financialAccountId, from, to),
      this.expenses.periodCategoryTotalsByTenant(tenantId, financialAccountId, previousFrom, previousTo)
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

  yearlyExpensesMonthlyTotals(tenantId: string, financialAccountId: string | undefined, year: number) {
    return this.expenses.yearlyMonthlyTotalsByTenant(tenantId, financialAccountId, year);
  }

  monthlyExpensesDailyTotals(tenantId: string, financialAccountId: string | undefined, month: string) {
    return this.expenses.monthlyDailyTotalsByTenant(tenantId, financialAccountId, month);
  }

  weeklyExpensesDailyTotals(tenantId: string, financialAccountId: string | undefined, weekStartIsoDate: string) {
    return this.expenses.weeklyDailyTotalsByTenant(tenantId, financialAccountId, weekStartIsoDate);
  }

  upcomingExpenseInstallmentsMonthlyTotals(tenantId: string, financialAccountId: string | undefined, startMonth: string, months = 6) {
    return this.expenses.upcomingInstallmentsMonthlyTotalsByTenant(tenantId, financialAccountId, startMonth, months);
  }

  yearlyIncomesMonthlyTotals(tenantId: string, financialAccountId: string | undefined, year: number) {
    return this.incomes.yearlyMonthlyTotalsByTenant(tenantId, financialAccountId, year);
  }

  monthlyIncomesDailyTotals(tenantId: string, financialAccountId: string | undefined, month: string) {
    return this.incomes.monthlyDailyTotalsByTenant(tenantId, financialAccountId, month);
  }

  periodExpenseCategoryTotals(tenantId: string, financialAccountId: string | undefined, from: string, to: string) {
    return this.expenses.periodCategoryTotalsByTenant(tenantId, financialAccountId, from, to);
  }

  private async resolvePaymentSelection(
    tenantId: string,
    financialAccountId: string | undefined,
    input: { paymentMethod: Expense['paymentMethod']; paymentMethodOptionId?: string; bankOptionId?: string }
  ) {
    return this.paymentSelections.resolve(tenantId, financialAccountId, input);
  }

  private async resolveSharedExpenseAllocationsOnCreate(input: {
    financialAccountId?: string;
    userId: string;
    paidByUserId?: string;
    amount: number;
    allocationMode?: ExpenseAllocationMode;
    allocations?: Array<{ owedByUserId: string; amount: number }>;
  }) {
    return this.resolveSharedExpenseAllocations({
      financialAccountId: input.financialAccountId,
      actorUserId: input.userId,
      paidByUserId: input.paidByUserId ?? input.userId,
      amount: input.amount,
      allocationMode: input.allocationMode,
      allocations: input.allocations
    });
  }

  private async resolveSharedExpenseAllocationsOnUpdate(
    input: {
      financialAccountId?: string;
      userId: string;
      amount: number;
      paidByUserId?: string;
      allocationMode?: ExpenseAllocationMode;
      allocations?: Array<{ owedByUserId: string; amount: number }>;
    },
    existing: Expense
  ) {
    const hasExplicitAllocationUpdate =
      Object.prototype.hasOwnProperty.call(input, 'paidByUserId') ||
      Object.prototype.hasOwnProperty.call(input, 'allocationMode') ||
      Object.prototype.hasOwnProperty.call(input, 'allocations');

    if (!hasExplicitAllocationUpdate && input.amount === (existing.totalAmount ?? existing.amount)) {
      return {
        paidByUserId: existing.paidByUserId,
        allocationMode: existing.allocationMode,
        allocations: existing.allocations?.map((allocation) => ({
          owedByUserId: allocation.owedByUserId,
          amount: allocation.amount
        }))
      };
    }

    const inferredAllocations = !hasExplicitAllocationUpdate && existing.allocations?.length
      ? scaleExistingAllocations(existing, input.amount)
      : input.allocations;

    return this.resolveSharedExpenseAllocations({
      financialAccountId: input.financialAccountId,
      actorUserId: input.userId,
      paidByUserId: input.paidByUserId ?? existing.paidByUserId ?? input.userId,
      amount: input.amount,
      allocationMode: input.allocationMode ?? existing.allocationMode,
      allocations: inferredAllocations
    });
  }

  private async resolveSharedExpenseAllocations(input: {
    financialAccountId?: string;
    actorUserId: string;
    paidByUserId: string;
    amount: number;
    allocationMode?: ExpenseAllocationMode;
    allocations?: Array<{ owedByUserId: string; amount: number }>;
  }) {
    if (!input.financialAccountId || !this.financialAccounts) {
      return {
        paidByUserId: input.paidByUserId,
        allocationMode: input.allocationMode,
        allocations: input.allocations
      };
    }

    const financialAccount = await this.financialAccounts.findById(input.financialAccountId);
    if (!financialAccount || financialAccount.type !== 'shared') {
      return {
        paidByUserId: input.paidByUserId,
        allocationMode: input.allocationMode,
        allocations: input.allocations
      };
    }

    const members = await this.financialAccounts.listMembers(input.financialAccountId);
    const activeMemberIds = members.filter((member) => member.status === 'active').map((member) => member.userId);
    if (!activeMemberIds.includes(input.paidByUserId)) {
      throw new Error('Paid-by user must be an active member of the shared account.');
    }

    const requestedMode = input.allocations?.length ? (input.allocationMode ?? 'custom') : (input.allocationMode ?? 'payer');
    if (requestedMode === 'equal') {
      return {
        paidByUserId: input.paidByUserId,
        allocationMode: 'equal' as const,
        allocations: splitAmountEqually(input.amount, activeMemberIds).map((allocation) => ({
          owedByUserId: allocation.userId,
          amount: allocation.amount
        }))
      };
    }

    if (requestedMode === 'custom') {
      const allocations = normalizeCustomAllocations(input.amount, input.allocations ?? []);
      for (const allocation of allocations) {
        if (!activeMemberIds.includes(allocation.owedByUserId)) {
          throw new Error('Every allocation member must be active in the shared account.');
        }
      }
      return {
        paidByUserId: input.paidByUserId,
        allocationMode: 'custom' as const,
        allocations
      };
    }

    return {
      paidByUserId: input.paidByUserId,
      allocationMode: 'payer' as const,
      allocations: [{ owedByUserId: input.paidByUserId, amount: roundMoney(input.amount) }]
    };
  }
}

function scaleExistingAllocations(existing: Expense, nextAmount: number) {
  const previousAllocations = existing.allocations ?? [];
  if (!previousAllocations.length) return undefined;

  if (existing.allocationMode === 'equal') {
    return splitAmountEqually(nextAmount, previousAllocations.map((allocation) => allocation.owedByUserId)).map((allocation) => ({
      owedByUserId: allocation.userId,
      amount: allocation.amount
    }));
  }

  if (existing.allocationMode === 'custom') {
    const previousTotal = previousAllocations.reduce((sum, allocation) => sum + allocation.amount, 0);
    if (previousTotal <= 0) {
      return [{ owedByUserId: existing.paidByUserId ?? existing.userId, amount: roundMoney(nextAmount) }];
    }

    const targetCents = Math.round(nextAmount * 100);
    let allocatedCents = 0;
    return previousAllocations.map((allocation, index) => {
      if (index === previousAllocations.length - 1) {
        return {
          owedByUserId: allocation.owedByUserId,
          amount: (targetCents - allocatedCents) / 100
        };
      }
      const cents = Math.round((allocation.amount / previousTotal) * targetCents);
      allocatedCents += cents;
      return {
        owedByUserId: allocation.owedByUserId,
        amount: cents / 100
      };
    });
  }

  return [{ owedByUserId: existing.paidByUserId ?? existing.userId, amount: roundMoney(nextAmount) }];
}

function splitAmountEqually(amount: number, userIds: string[]) {
  if (!userIds.length) throw new Error('Shared account must have at least one active member.');
  const totalCents = Math.round(amount * 100);
  const base = Math.floor(totalCents / userIds.length);
  let remainder = totalCents - (base * userIds.length);
  return userIds.map((userId) => {
    const cents = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
    return { userId, amount: cents / 100 };
  });
}

function normalizeCustomAllocations(amount: number, allocations: Array<{ owedByUserId: string; amount: number }>) {
  if (!allocations.length) {
    throw new Error('Custom allocations require at least one member allocation.');
  }

  const normalized = allocations.map((allocation) => ({
    owedByUserId: allocation.owedByUserId,
    amount: roundMoney(allocation.amount)
  }));
  const total = roundMoney(normalized.reduce((sum, allocation) => sum + allocation.amount, 0));
  if (Math.abs(total - roundMoney(amount)) > 0.009) {
    throw new Error('Allocation amounts must match the expense total.');
  }
  return normalized;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
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
