import { randomUUID } from 'node:crypto';
import type { BudgetRepository, CategoryRepository, ExpenseRepository, IncomeRepository, OtpRepository, UserRepository, WhatsAppMessageAuditRepository } from '../../application/ports.js';
import type { Category, Expense, Income, MonthlyBudget, ReportFrequency, User } from '../../domain/types.js';

export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();

  async findByPhoneNumber(phoneNumber: string) {
    return [...this.users.values()].find((user) => user.phoneNumber === phoneNumber);
  }

  async findById(userId: string) {
    return this.users.get(userId);
  }

  async listByReportFrequency(frequency: ReportFrequency) {
    return [...this.users.values()].filter((user) => user.reportPreferences.includes(frequency));
  }

  async upsertByPhoneNumber(input: Omit<User, 'id' | 'tenantId' | 'role' | 'reportPreferences'>) {
    const existing = await this.findByPhoneNumber(input.phoneNumber);
    if (existing) {
      const updated = { ...existing, ...input };
      this.users.set(updated.id, updated);
      return updated;
    }

    const user: User = {
      ...input,
      id: randomUUID(),
      tenantId: randomUUID(),
      role: 'consumer',
      reportPreferences: ['monthly']
    };
    this.users.set(user.id, user);
    return user;
  }

  async updateProfile(userId: string, input: Pick<User, 'name' | 'email' | 'countryOfResidence' | 'preferredCurrency'>) {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found.');
    const updated = { ...user, ...input };
    this.users.set(userId, updated);
    return updated;
  }

  async updateReportPreferences(userId: string, preferences: ReportFrequency[]) {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found.');
    const updated = { ...user, reportPreferences: preferences };
    this.users.set(userId, updated);
    return updated;
  }
}

export class InMemoryOtpRepository implements OtpRepository {
  private readonly otps = new Map<string, { code: string; expiresAt: Date }>();

  async create(phoneNumber: string, code: string, expiresAt: Date) {
    this.otps.set(phoneNumber, { code, expiresAt });
  }

  async verify(phoneNumber: string, code: string, now: Date) {
    const otp = this.otps.get(phoneNumber);
    const valid = Boolean(otp && otp.code === code && otp.expiresAt >= now);
    if (valid) this.otps.delete(phoneNumber);
    return valid;
  }
}

export class InMemoryCategoryRepository implements CategoryRepository {
  private readonly categories: Category[] = [];

  async listByTenant(tenantId: string) {
    return this.categories.filter((category) => category.tenantId === tenantId);
  }

  async create(input: Omit<Category, 'id'>) {
    const category = { ...input, id: randomUUID() };
    this.categories.push(category);
    return category;
  }

  async ensureDefaults(tenantId: string) {
    if ((await this.listByTenant(tenantId)).length > 0) return;
    for (const name of ['Food', 'Transport', 'Housing', 'Health', 'Entertainment', 'Other']) {
      await this.create({ tenantId, name, isDefault: true });
    }
  }
}

export class InMemoryExpenseRepository implements ExpenseRepository {
  private readonly expenses: Expense[] = [];

  async create(input: Omit<Expense, 'id'>) {
    const expense = { ...input, id: randomUUID() };
    this.expenses.push(expense);
    return expense;
  }

  async list(input: {
    tenantId: string;
    from?: string;
    to?: string;
    categoryId?: string;
    currency?: string;
    paymentMethodKind?: 'cash' | 'card';
    limit: number;
  }) {
    return this.expenses
      .filter((expense) => expense.tenantId === input.tenantId)
      .filter((expense) => !input.from || expense.date >= input.from)
      .filter((expense) => !input.to || expense.date <= input.to)
      .filter((expense) => !input.categoryId || expense.categoryId === input.categoryId)
      .filter((expense) => !input.currency || expense.currency === input.currency)
      .filter((expense) => !input.paymentMethodKind || expense.paymentMethod.kind === input.paymentMethodKind)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, input.limit);
  }

  async listRecent(tenantId: string, limit: number) {
    return this.expenses
      .filter((expense) => expense.tenantId === tenantId)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, limit);
  }

  async listByPeriod(tenantId: string, from: string, to: string) {
    return this.expenses.filter((expense) => expense.tenantId === tenantId && expense.date >= from && expense.date <= to);
  }
}

export class InMemoryIncomeRepository implements IncomeRepository {
  private readonly incomes: Income[] = [];

  async create(input: Omit<Income, 'id'>) {
    const income = { ...input, id: randomUUID() };
    this.incomes.push(income);
    return income;
  }

  async list(input: {
    tenantId: string;
    from?: string;
    to?: string;
    currency?: string;
    limit: number;
  }) {
    return this.incomes
      .filter((income) => income.tenantId === input.tenantId)
      .filter((income) => !input.from || income.date >= input.from)
      .filter((income) => !input.to || income.date <= input.to)
      .filter((income) => !input.currency || income.currency === input.currency)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, input.limit);
  }

  async listByPeriod(tenantId: string, from: string, to: string) {
    return this.incomes.filter((income) => income.tenantId === tenantId && income.date >= from && income.date <= to);
  }
}

export class InMemoryBudgetRepository implements BudgetRepository {
  private readonly budgets: MonthlyBudget[] = [];

  async upsertMonthly(input: Omit<MonthlyBudget, 'id'>) {
    const index = this.budgets.findIndex(
      (budget) =>
        budget.tenantId === input.tenantId &&
        budget.month === input.month &&
        budget.categoryId === input.categoryId &&
        budget.subcategoryId === input.subcategoryId
    );
    const budget = { ...input, id: index >= 0 ? this.budgets[index].id : randomUUID() };
    if (index >= 0) this.budgets[index] = budget;
    else this.budgets.push(budget);
    return budget;
  }

  async listMonthly(tenantId: string, month: string) {
    return this.budgets.filter((budget) => budget.tenantId === tenantId && budget.month === month);
  }
}

export class InMemoryWhatsAppMessageAuditRepository implements WhatsAppMessageAuditRepository {
  readonly messages: Array<Parameters<WhatsAppMessageAuditRepository['create']>[0]> = [];

  async reserve(input: Parameters<WhatsAppMessageAuditRepository['reserve']>[0]) {
    if (this.messages.some((message) => message.providerMessageId === input.providerMessageId)) {
      return false;
    }

    this.messages.push({ ...input, parsingStatus: 'processing' });
    return true;
  }

  async updateByProviderMessageId(
    providerMessageId: string,
    input: Parameters<WhatsAppMessageAuditRepository['updateByProviderMessageId']>[1]
  ) {
    const index = this.messages.findIndex((message) => message.providerMessageId === providerMessageId);
    if (index < 0) return;
    this.messages[index] = { ...this.messages[index], ...input };
  }

  async create(input: Parameters<WhatsAppMessageAuditRepository['create']>[0]) {
    this.messages.push(input);
  }
}
