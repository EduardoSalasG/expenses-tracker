import type {
  BudgetRepository,
  CategoryRepository,
  Clock,
  ExpenseRepository,
  IncomeRepository,
  OtpRepository,
  TokenService,
  UserRepository,
  WhatsAppMessageAuditRepository,
  WhatsAppProvider
} from './ports.js';
import { parseExpenseMessage } from './expense-parser.js';
import type { Category, Expense, Income, MonthlyBudget, ReportFrequency } from '../domain/types.js';

export class RequestOtpUseCase {
  constructor(
    private readonly otps: OtpRepository,
    private readonly whatsapp: WhatsAppProvider,
    private readonly clock: Clock
  ) {}

  async execute(phoneNumber: string) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(this.clock.now().getTime() + 10 * 60 * 1000);
    await this.otps.create(phoneNumber, code, expiresAt);
    await this.whatsapp.sendText(phoneNumber, `Your Expenses Tracker verification code is ${code}. It expires in 10 minutes.`);
    return { sent: true };
  }
}

export class VerifyOtpUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly otps: OtpRepository,
    private readonly categories: CategoryRepository,
    private readonly tokens: TokenService,
    private readonly clock: Clock
  ) {}

  async execute(input: { phoneNumber: string; code: string; name?: string; email?: string; countryOfResidence?: string; preferredCurrency?: string }) {
    const verified = await this.otps.verify(input.phoneNumber, input.code, this.clock.now());
    if (!verified) {
      throw new Error('Invalid or expired OTP.');
    }

    const user = await this.users.upsertByPhoneNumber({
      phoneNumber: input.phoneNumber,
      name: input.name ?? 'New user',
      email: input.email,
      countryOfResidence: input.countryOfResidence ?? 'Unknown',
      preferredCurrency: input.preferredCurrency ?? 'USD'
    });
    await this.categories.ensureDefaults(user.tenantId);

    return {
      user,
      accessToken: this.tokens.signAccessToken(user),
      refreshToken: this.tokens.signRefreshToken(user)
    };
  }
}

export class RefreshSessionUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly tokens: TokenService
  ) {}

  async execute(refreshToken: string) {
    const payload = this.tokens.verifyRefreshToken(refreshToken);
    const user = await this.users.findById(payload.userId);
    if (!user || user.tenantId !== payload.tenantId) {
      throw new Error('Invalid refresh token.');
    }

    return {
      user,
      accessToken: this.tokens.signAccessToken(user),
      refreshToken: this.tokens.signRefreshToken(user)
    };
  }
}

export class ProcessWhatsAppExpenseUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly categories: CategoryRepository,
    private readonly expenses: ExpenseRepository,
    private readonly messageAudits: WhatsAppMessageAuditRepository,
    private readonly whatsapp: WhatsAppProvider,
    private readonly clock: Clock
  ) {}

  async execute(input: { providerMessageId?: string; fromPhoneNumber: string; message: string }) {
    const reserved = input.providerMessageId
      ? await this.messageAudits.reserve({
        providerMessageId: input.providerMessageId,
        fromPhoneNumber: input.fromPhoneNumber,
        message: input.message
      })
      : true;

    if (!reserved) {
      return { status: 'duplicate_ignored' as const };
    }

    const user = await this.users.findByPhoneNumber(input.fromPhoneNumber);
    if (!user) {
      await this.auditMessage(input, { parsingStatus: 'unknown_user' });
      return { status: 'ignored_unregistered_sender' as const };
    }

    const parsed = parseExpenseMessage(input.message, user.preferredCurrency);
    if (parsed.status !== 'ready' || !parsed.amount || !parsed.concept || !parsed.paymentMethod) {
      await this.auditMessage(input, {
        tenantId: user.tenantId,
        userId: user.id,
        parsingStatus: 'needs_confirmation'
      });
      await this.whatsapp.sendText(input.fromPhoneNumber, `Please send the missing expense data: ${parsed.missingFields.join(', ')}.`);
      return { status: 'needs_confirmation' as const, missingFields: parsed.missingFields };
    }

    const categories = await this.categories.listByTenant(user.tenantId);
    const fallbackCategory = categories.find((category) => !category.parentId) ?? categories[0];
    if (!fallbackCategory) {
      throw new Error('No category is available for this tenant.');
    }

    const expense = await this.expenses.create({
      tenantId: user.tenantId,
      userId: user.id,
      date: this.clock.now().toISOString(),
      amount: parsed.amount,
      currency: parsed.currency ?? user.preferredCurrency,
      concept: parsed.concept,
      categoryId: fallbackCategory.id,
      paymentMethod: parsed.paymentMethod,
      originalMessage: input.message
    });

    await this.auditMessage(input, {
      tenantId: user.tenantId,
      userId: user.id,
      parsingStatus: 'saved',
      expenseId: expense.id
    });
    await this.whatsapp.sendText(input.fromPhoneNumber, `Saved ${expense.currency} ${expense.amount.toFixed(2)} for ${expense.concept}.`);
    return { status: 'saved' as const, expense };
  }

  private auditMessage(
    input: { providerMessageId?: string; fromPhoneNumber: string; message: string },
    audit: {
      tenantId?: string;
      userId?: string;
      parsingStatus: 'saved' | 'needs_confirmation' | 'unknown_user' | 'failed';
      expenseId?: string;
    }
  ) {
    if (input.providerMessageId) {
      return this.messageAudits.updateByProviderMessageId(input.providerMessageId, audit);
    }

    return this.messageAudits.create({
      ...audit,
      fromPhoneNumber: input.fromPhoneNumber,
      message: input.message
    });
  }
}

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
    paymentMethodKind?: 'cash' | 'card';
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

export class UpdateReportPreferencesUseCase {
  constructor(private readonly users: UserRepository) {}

  execute(userId: string, preferences: ReportFrequency[]) {
    return this.users.updateReportPreferences(userId, preferences);
  }
}

export class UpdateProfileUseCase {
  constructor(private readonly users: UserRepository) {}

  execute(userId: string, input: { name: string; email?: string; countryOfResidence: string; preferredCurrency: string }) {
    return this.users.updateProfile(userId, input);
  }
}

export class SendDueReportsUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly finance: FinanceUseCases,
    private readonly whatsapp: WhatsAppProvider,
    private readonly clock: Clock
  ) {}

  async execute(frequency: ReportFrequency) {
    const users = await this.users.listByReportFrequency(frequency);
    const period = reportPeriod(frequency, this.clock.now());
    const results = [];

    for (const user of users) {
      const report = await this.finance.report(user.tenantId, period.from, period.to);
      const body = formatReportMessage(frequency, period.label, report);
      await this.whatsapp.sendText(user.phoneNumber, body);
      results.push({ userId: user.id, phoneNumber: user.phoneNumber, tenantId: user.tenantId });
    }

    return { frequency, period, sent: results.length, recipients: results };
  }
}

function totalsByCurrency(items: Array<{ amount: number; currency: string }>) {
  return items.reduce<Record<string, number>>((totals, item) => {
    totals[item.currency] = (totals[item.currency] ?? 0) + item.amount;
    return totals;
  }, {});
}

function reportPeriod(frequency: ReportFrequency, now: Date) {
  if (frequency === 'daily') {
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59));
    return { from: from.toISOString(), to: to.toISOString(), label: from.toISOString().slice(0, 10) };
  }

  if (frequency === 'weekly') {
    const day = now.getUTCDay() || 7;
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day + 1, 0, 0, 0));
    const to = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() + 6, 23, 59, 59));
    return { from: from.toISOString(), to: to.toISOString(), label: `${from.toISOString().slice(0, 10)} to ${to.toISOString().slice(0, 10)}` };
  }

  if (frequency === 'monthly') {
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
    const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));
    return { from: from.toISOString(), to: to.toISOString(), label: from.toISOString().slice(0, 7) };
  }

  const from = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0));
  const to = new Date(Date.UTC(now.getUTCFullYear(), 11, 31, 23, 59, 59));
  return { from: from.toISOString(), to: to.toISOString(), label: String(now.getUTCFullYear()) };
}

function formatReportMessage(
  frequency: ReportFrequency,
  label: string,
  report: Awaited<ReturnType<FinanceUseCases['report']>>
) {
  const expenseTotals = formatTotals(report.expenseTotalsByCurrency);
  const incomeTotals = formatTotals(report.incomeTotalsByCurrency);
  return [
    `Expenses Tracker ${frequency} report (${label})`,
    `Income: ${incomeTotals}`,
    `Expenses: ${expenseTotals}`,
    `Income records: ${report.incomes.length}`,
    `Expense records: ${report.expenses.length}`
  ].join('\n');
}

function formatTotals(totals: Record<string, number>) {
  const entries = Object.entries(totals);
  if (!entries.length) return 'No movement';
  return entries
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([currency, amount]) => `${currency} ${amount.toFixed(2)}`)
    .join(' | ');
}
