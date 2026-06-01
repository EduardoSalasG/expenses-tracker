import { randomUUID } from 'node:crypto';
import type {
  BudgetRepository,
  CategoryRepository,
  ExpenseRepository,
  IncomeRepository,
  MessagingMessageAuditRepository,
  MessagingPendingDraftRepository,
  OtpRepository,
  ReportDispatchRepository,
  TelegramLinkTokenRepository,
  UserRepository,
  CategoryTotalByPeriod,
  CurrencyTotalByPeriod
} from '../../application/ports.js';
import type { Category, ConversationPendingDraft, Expense, Income, MonthlyBudget, ReportFrequency, User } from '../../domain/index.js';

export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();

  async findByPhoneNumber(phoneNumber: string) {
    return [...this.users.values()].find((user) => user.phoneNumber === phoneNumber);
  }

  async findByTelegramChatId(chatId: string) {
    return [...this.users.values()].find((user) => user.telegramChatId === chatId);
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

  async linkTelegramChatByPhone(phoneNumber: string, chatId: string, username?: string) {
    const user = await this.findByPhoneNumber(phoneNumber);
    if (!user) return undefined;
    const updated: User = { ...user, telegramChatId: chatId, telegramUsername: username ?? user.telegramUsername };
    this.users.set(updated.id, updated);
    return updated;
  }

  async updateProfile(userId: string, input: Pick<User, 'firstName' | 'lastName' | 'preferredName' | 'email' | 'countryOfResidence' | 'preferredCurrency' | 'preferredLanguage'>) {
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
    const roots = new Map<string, Category>();
    for (const root of DEFAULT_CATEGORY_TREE) {
      const category = await this.create({ tenantId, name: root.name, isDefault: true });
      roots.set(root.name, category);
    }

    for (const root of DEFAULT_CATEGORY_TREE) {
      const parent = roots.get(root.name);
      if (!parent) continue;
      for (const subcategory of root.subcategories) {
        await this.create({ tenantId, name: subcategory, parentId: parent.id, isDefault: true });
      }
    }
  }
}

const DEFAULT_CATEGORY_TREE = [
  { name: 'Food', subcategories: ['Groceries', 'Restaurants'] },
  { name: 'Transport', subcategories: ['Public Transport', 'Uber'] },
  { name: 'Housing', subcategories: ['Rent'] },
  { name: 'Health', subcategories: ['Appointments', 'Medicines', 'Procedures', 'Sports'] },
  { name: 'Entertainment', subcategories: ['Dance', 'Theater'] },
  { name: 'Education', subcategories: ['Dance', 'Work'] },
  { name: 'Services', subcategories: ['Phone'] },
  { name: 'Other', subcategories: ['Gifts'] }
];

export class InMemoryExpenseRepository implements ExpenseRepository {
  private readonly expenses: Expense[] = [];

  async create(input: Omit<Expense, 'id'>) {
    const expense = { ...input, id: randomUUID() };
    this.expenses.push(expense);
    return expense;
  }

  async update(input: {
    tenantId: string;
    expenseId: string;
    amount?: number;
    concept?: string;
    categoryId?: string;
    subcategoryId?: string | null;
  }) {
    const index = this.expenses.findIndex((expense) => expense.tenantId === input.tenantId && expense.id === input.expenseId);
    if (index < 0) return undefined;
    this.expenses[index] = {
      ...this.expenses[index],
      amount: input.amount ?? this.expenses[index].amount,
      concept: input.concept ?? this.expenses[index].concept,
      categoryId: input.categoryId ?? this.expenses[index].categoryId,
      subcategoryId: Object.prototype.hasOwnProperty.call(input, 'subcategoryId')
        ? input.subcategoryId ?? undefined
        : this.expenses[index].subcategoryId
    };
    return this.expenses[index];
  }

  async list(input: {
    tenantId: string;
    from?: string;
    to?: string;
    categoryId?: string;
    currency?: string;
    paymentMethodKind?: 'cash' | 'card' | 'transfer';
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

  async yearlyMonthlyTotalsByTenant(tenantId: string, year: number) {
    const source = this.expenses.filter((expense) =>
      expense.tenantId === tenantId && new Date(expense.date).getUTCFullYear() === year
    );
    return aggregateCurrencyTotalsBy(source, (expense) => {
      const date = new Date(expense.date);
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    });
  }

  async monthlyDailyTotalsByTenant(tenantId: string, month: string) {
    const [year, monthNumber] = month.split('-').map(Number);
    const source = this.expenses.filter((expense) => {
      if (expense.tenantId !== tenantId) return false;
      const date = new Date(expense.date);
      return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === monthNumber;
    });
    return aggregateCurrencyTotalsBy(source, (expense) => {
      const date = new Date(expense.date);
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
    });
  }

  async weeklyDailyTotalsByTenant(tenantId: string, weekStartIsoDate: string) {
    const weekStart = new Date(`${weekStartIsoDate}T00:00:00.000Z`);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    weekEnd.setUTCHours(23, 59, 59, 999);
    const source = this.expenses.filter((expense) => {
      if (expense.tenantId !== tenantId) return false;
      const date = new Date(expense.date);
      return date >= weekStart && date <= weekEnd;
    });
    return aggregateCurrencyTotalsBy(source, (expense) => {
      const date = new Date(expense.date);
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
    });
  }

  async periodCategoryTotalsByTenant(tenantId: string, from: string, to: string) {
    const totals = new Map<string, CategoryTotalByPeriod>();
    for (const expense of this.expenses) {
      if (expense.tenantId !== tenantId) continue;
      if (expense.date < from || expense.date > to) continue;
      const key = [expense.categoryId, expense.subcategoryId ?? '', expense.currency].join('__');
      const existing = totals.get(key);
      if (existing) {
        existing.total += Number(expense.amount);
        continue;
      }
      totals.set(key, {
        categoryId: expense.categoryId,
        subcategoryId: expense.subcategoryId,
        currency: expense.currency,
        total: Number(expense.amount)
      });
    }
    return [...totals.values()];
  }
}

export class InMemoryIncomeRepository implements IncomeRepository {
  private readonly incomes: Income[] = [];

  async create(input: Omit<Income, 'id'>) {
    const income = { ...input, id: randomUUID() };
    this.incomes.push(income);
    return income;
  }

  async update(input: {
    tenantId: string;
    incomeId: string;
    amount?: number;
    concept?: string;
  }) {
    const index = this.incomes.findIndex((income) => income.tenantId === input.tenantId && income.id === input.incomeId);
    if (index < 0) return undefined;
    this.incomes[index] = {
      ...this.incomes[index],
      amount: input.amount ?? this.incomes[index].amount,
      concept: input.concept ?? this.incomes[index].concept
    };
    return this.incomes[index];
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

  async listRecent(tenantId: string, limit: number) {
    return this.incomes
      .filter((income) => income.tenantId === tenantId)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, limit);
  }

  async yearlyMonthlyTotalsByTenant(tenantId: string, year: number) {
    const source = this.incomes.filter((income) =>
      income.tenantId === tenantId && new Date(income.date).getUTCFullYear() === year
    );
    return aggregateCurrencyTotalsBy(source, (income) => {
      const date = new Date(income.date);
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    });
  }

  async monthlyDailyTotalsByTenant(tenantId: string, month: string) {
    const [year, monthNumber] = month.split('-').map(Number);
    const source = this.incomes.filter((income) => {
      if (income.tenantId !== tenantId) return false;
      const date = new Date(income.date);
      return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === monthNumber;
    });
    return aggregateCurrencyTotalsBy(source, (income) => {
      const date = new Date(income.date);
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
    });
  }
}

function aggregateCurrencyTotalsBy<T extends { amount: number; currency: string }>(
  items: T[],
  periodKey: (item: T) => string
): CurrencyTotalByPeriod[] {
  const totals = new Map<string, CurrencyTotalByPeriod>();
  for (const item of items) {
    const key = `${periodKey(item)}__${item.currency}`;
    const existing = totals.get(key);
    if (existing) {
      existing.total += Number(item.amount);
      continue;
    }
    totals.set(key, {
      periodKey: periodKey(item),
      currency: item.currency,
      total: Number(item.amount)
    });
  }
  return [...totals.values()].sort((a, b) => a.periodKey.localeCompare(b.periodKey));
}

export class InMemoryBudgetRepository implements BudgetRepository {
  private readonly budgets: MonthlyBudget[] = [];

  async upsertMonthly(input: Omit<MonthlyBudget, 'id'>) {
    const index = this.budgets.findIndex(
      (budget) =>
        budget.tenantId === input.tenantId &&
        budget.categoryId === input.categoryId &&
        budget.subcategoryId === input.subcategoryId
    );
    const budget = { ...input, id: index >= 0 ? this.budgets[index].id : randomUUID() };
    if (index >= 0) this.budgets[index] = budget;
    else this.budgets.push(budget);
    return budget;
  }

  async listMonthly(tenantId: string) {
    return this.budgets.filter((budget) => budget.tenantId === tenantId);
  }
}

export class InMemoryMessagingMessageAuditRepository implements MessagingMessageAuditRepository {
  readonly messages: Array<Parameters<MessagingMessageAuditRepository['create']>[0] & { createdAt?: string }> = [];

  async reserve(input: Parameters<MessagingMessageAuditRepository['reserve']>[0]) {
    const channel = input.channel ?? 'whatsapp';
    if (this.messages.some((message) =>
      message.providerMessageId === input.providerMessageId &&
      (message.channel ?? 'whatsapp') === channel
    )) {
      return false;
    }

    this.messages.push({ ...input, channel, parsingStatus: 'processing', createdAt: new Date().toISOString() });
    return true;
  }

  async updateByProviderMessageId(
    providerMessageId: string,
    input: Parameters<MessagingMessageAuditRepository['updateByProviderMessageId']>[1]
  ) {
    const channel = input.channel ?? 'whatsapp';
    const index = this.messages.findIndex((message) =>
      message.providerMessageId === providerMessageId &&
      (message.channel ?? 'whatsapp') === channel
    );
    if (index < 0) return;
    this.messages[index] = { ...this.messages[index], ...input };
  }

  async create(input: Parameters<MessagingMessageAuditRepository['create']>[0]) {
    this.messages.push({ ...input, createdAt: new Date().toISOString() });
  }

  async existsRecentDuplicate(input: {
    channel?: 'whatsapp' | 'telegram';
    fromPhoneNumber: string;
    message: string;
    since: Date;
    excludeProviderMessageId?: string;
  }) {
    const channel = input.channel ?? 'whatsapp';
    const sinceIso = input.since.toISOString();
    return this.messages.some((message) =>
      (message.channel ?? 'whatsapp') === channel &&
      message.fromPhoneNumber === input.fromPhoneNumber &&
      message.message.trim().toLowerCase() === input.message.trim().toLowerCase() &&
      message.parsingStatus === 'saved' &&
      (!input.excludeProviderMessageId || message.providerMessageId !== input.excludeProviderMessageId) &&
      typeof message.createdAt === 'string' &&
      message.createdAt >= sinceIso
    );
  }
}

export class InMemoryMessagingPendingDraftRepository implements MessagingPendingDraftRepository {
  readonly drafts: ConversationPendingDraft[] = [];

  async findActive(tenantId: string, userId: string, now: Date, channel = 'whatsapp') {
    return this.drafts.find((draft) =>
      draft.tenantId === tenantId &&
      draft.userId === userId &&
      (draft.channel ?? 'whatsapp') === channel &&
      draft.expiresAt >= now.toISOString()
    );
  }

  async upsert(input: Omit<ConversationPendingDraft, 'id'>) {
    const channel = input.channel ?? 'whatsapp';
    const index = this.drafts.findIndex((draft) =>
      draft.tenantId === input.tenantId &&
      draft.userId === input.userId &&
      (draft.channel ?? 'whatsapp') === channel
    );
    const draft = { ...input, id: index >= 0 ? this.drafts[index].id : randomUUID() };
    if (index >= 0) this.drafts[index] = draft;
    else this.drafts.push(draft);
    return draft;
  }

  async clear(tenantId: string, userId: string, channel = 'whatsapp') {
    const index = this.drafts.findIndex((draft) =>
      draft.tenantId === tenantId &&
      draft.userId === userId &&
      (draft.channel ?? 'whatsapp') === channel
    );
    if (index >= 0) this.drafts.splice(index, 1);
  }
}

export class InMemoryReportDispatchRepository implements ReportDispatchRepository {
  private readonly dispatches: Array<{
    tenantId: string;
    userId: string;
    channel: 'whatsapp' | 'telegram';
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    periodFrom: string;
    periodTo: string;
    status: 'pending' | 'sent' | 'failed';
    errorMessage?: string;
  }> = [];

  async reserve(input: {
    tenantId: string;
    userId: string;
    channel?: 'whatsapp' | 'telegram';
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    periodFrom: string;
    periodTo: string;
  }) {
    const channel = input.channel ?? 'whatsapp';
    const exists = this.dispatches.some((item) =>
      item.channel === channel &&
      item.frequency === input.frequency &&
      item.periodFrom === input.periodFrom &&
      item.periodTo === input.periodTo &&
      item.userId === input.userId &&
      (item.status === 'pending' || item.status === 'sent')
    );
    if (exists) return false;

    this.dispatches.push({
      tenantId: input.tenantId,
      userId: input.userId,
      channel,
      frequency: input.frequency,
      periodFrom: input.periodFrom,
      periodTo: input.periodTo,
      status: 'pending'
    });
    return true;
  }

  async markSent(input: {
    userId: string;
    channel?: 'whatsapp' | 'telegram';
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    periodFrom: string;
    periodTo: string;
  }) {
    const channel = input.channel ?? 'whatsapp';
    const dispatch = this.dispatches.find((item) =>
      item.channel === channel &&
      item.frequency === input.frequency &&
      item.periodFrom === input.periodFrom &&
      item.periodTo === input.periodTo &&
      item.userId === input.userId &&
      item.status === 'pending'
    );
    if (!dispatch) return;
    dispatch.status = 'sent';
    dispatch.errorMessage = undefined;
  }

  async markFailed(input: {
    userId: string;
    channel?: 'whatsapp' | 'telegram';
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    periodFrom: string;
    periodTo: string;
    errorMessage: string;
  }) {
    const channel = input.channel ?? 'whatsapp';
    const dispatch = this.dispatches.find((item) =>
      item.channel === channel &&
      item.frequency === input.frequency &&
      item.periodFrom === input.periodFrom &&
      item.periodTo === input.periodTo &&
      item.userId === input.userId &&
      item.status === 'pending'
    );
    if (!dispatch) return;
    dispatch.status = 'failed';
    dispatch.errorMessage = input.errorMessage;
  }
}

export class InMemoryTelegramLinkTokenRepository implements TelegramLinkTokenRepository {
  private readonly tokens = new Map<string, { chatId: string; expiresAt: string; consumed: boolean }>();

  async create(input: { token: string; chatId: string; expiresAt: Date }) {
    this.tokens.set(input.token, {
      chatId: input.chatId,
      expiresAt: input.expiresAt.toISOString(),
      consumed: false
    });
  }

  async consume(token: string, now: Date) {
    const record = this.tokens.get(token);
    if (!record) return undefined;
    if (record.consumed) return undefined;
    if (record.expiresAt < now.toISOString()) return undefined;
    record.consumed = true;
    return {
      token,
      chatId: record.chatId,
      expiresAt: record.expiresAt
    };
  }
}
