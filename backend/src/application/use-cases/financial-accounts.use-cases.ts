import type { BankOption, Category, FinancialAccount, MonthlyBudget, PaymentMethodOption } from '../../domain/index.js';
import type { BankOptionRepository, BudgetRepository, CategoryRepository, FinancialAccountRepository, PaymentMethodOptionRepository } from '../ports.js';

export class FinancialAccountsUseCases {
  constructor(
    private readonly financialAccounts: FinancialAccountRepository,
    private readonly categories: CategoryRepository,
    private readonly budgets: BudgetRepository,
    private readonly banks: BankOptionRepository,
    private readonly paymentMethods: PaymentMethodOptionRepository
  ) {}

  listAccounts(userId: string) {
    return this.financialAccounts.listAccessibleByUser(userId);
  }

  async getAccountContext(userId: string, financialAccountId?: string) {
    const current = financialAccountId
      ? await this.financialAccounts.findAccessibleById(userId, financialAccountId)
      : undefined;
    const fallback = current ?? {
      account: await this.financialAccounts.ensurePersonalAccount(userId),
      role: 'owner' as const
    };

    return {
      current: fallback,
      accounts: await this.financialAccounts.listAccessibleByUser(userId)
    };
  }

  async selectAccount(userId: string, financialAccountId: string) {
    const membership = await this.financialAccounts.findAccessibleById(userId, financialAccountId);
    if (!membership) {
      throw new Error('Financial account not found.');
    }
    return membership;
  }

  async createSharedAccount(input: {
    userId: string;
    tenantId: string;
    sourceFinancialAccountId: string;
    name: string;
    currency: string;
  }) {
    const created = await this.financialAccounts.createSharedAccount({
      tenantId: input.tenantId,
      createdByUserId: input.userId,
      name: input.name,
      currency: input.currency
    });

    await this.cloneScopeData({
      tenantId: input.tenantId,
      sourceFinancialAccountId: input.sourceFinancialAccountId,
      targetFinancialAccountId: created.account.id,
      currency: input.currency
    });

    return created;
  }

  private async cloneScopeData(input: {
    tenantId: string;
    sourceFinancialAccountId: string;
    targetFinancialAccountId: string;
    currency: string;
  }) {
    const [categories, budgets, banks, paymentMethods] = await Promise.all([
      this.categories.listByTenant(input.tenantId, input.sourceFinancialAccountId),
      this.budgets.listMonthly(input.tenantId, input.sourceFinancialAccountId),
      this.banks.listByTenant(input.tenantId, input.sourceFinancialAccountId),
      this.paymentMethods.listByTenant(input.tenantId, input.sourceFinancialAccountId)
    ]);

    const rootCategories = categories.filter((category) => !category.parentId && category.financialAccountId === input.sourceFinancialAccountId);
    const clonedCategoryIds = new Map<string, string>();

    for (const category of rootCategories) {
      const created = await this.categories.create({
        tenantId: input.tenantId,
        financialAccountId: input.targetFinancialAccountId,
        name: category.name,
        isDefault: category.isDefault
      });
      clonedCategoryIds.set(category.id, created.id);
    }

    for (const category of categories.filter((item) => item.parentId && item.financialAccountId === input.sourceFinancialAccountId)) {
      const parentId = category.parentId ? clonedCategoryIds.get(category.parentId) : undefined;
      const created = await this.categories.create({
        tenantId: input.tenantId,
        financialAccountId: input.targetFinancialAccountId,
        name: category.name,
        parentId,
        isDefault: category.isDefault
      });
      clonedCategoryIds.set(category.id, created.id);
    }

    for (const bank of banks.filter((item) => item.financialAccountId === input.sourceFinancialAccountId && !item.isDefault)) {
      await this.banks.create({
        tenantId: input.tenantId,
        financialAccountId: input.targetFinancialAccountId,
        name: bank.name,
        isDefault: false
      } satisfies Omit<BankOption, 'id'>);
    }

    for (const paymentMethod of paymentMethods.filter((item) => item.financialAccountId === input.sourceFinancialAccountId && !item.isDefault)) {
      await this.paymentMethods.create({
        tenantId: input.tenantId,
        financialAccountId: input.targetFinancialAccountId,
        code: paymentMethod.code,
        name: paymentMethod.name,
        kind: paymentMethod.kind,
        cardType: paymentMethod.cardType,
        isDefault: false
      } satisfies Omit<PaymentMethodOption, 'id'>);
    }

    for (const budget of budgets.filter((item) => item.financialAccountId === input.sourceFinancialAccountId)) {
      await this.budgets.upsertMonthly({
        tenantId: input.tenantId,
        financialAccountId: input.targetFinancialAccountId,
        categoryId: clonedCategoryIds.get(budget.categoryId) ?? budget.categoryId,
        subcategoryId: budget.subcategoryId ? clonedCategoryIds.get(budget.subcategoryId) ?? budget.subcategoryId : undefined,
        amount: budget.amount,
        currency: budget.currency ?? input.currency
      } satisfies Omit<MonthlyBudget, 'id'>);
    }
  }
}
