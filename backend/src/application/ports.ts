import type { InterpretedMessage, MessageInterpreterContext } from './message-interpreter.js';
import type { Category, Expense, Income, MonthlyBudget, ReportFrequency, TenantId, User } from '../domain/types.js';

export interface UserRepository {
  findByPhoneNumber(phoneNumber: string): Promise<User | undefined>;
  findById(userId: string): Promise<User | undefined>;
  listByReportFrequency(frequency: ReportFrequency): Promise<User[]>;
  upsertByPhoneNumber(input: Omit<User, 'id' | 'tenantId' | 'role' | 'reportPreferences'>): Promise<User>;
  updateProfile(userId: string, input: Pick<User, 'name' | 'email' | 'countryOfResidence' | 'preferredCurrency'>): Promise<User>;
  updateReportPreferences(userId: string, preferences: ReportFrequency[]): Promise<User>;
}

export interface OtpRepository {
  create(phoneNumber: string, code: string, expiresAt: Date): Promise<void>;
  verify(phoneNumber: string, code: string, now: Date): Promise<boolean>;
}

export interface CategoryRepository {
  listByTenant(tenantId: TenantId): Promise<Category[]>;
  create(input: Omit<Category, 'id'>): Promise<Category>;
  ensureDefaults(tenantId: TenantId): Promise<void>;
}

export interface ExpenseRepository {
  create(input: Omit<Expense, 'id'>): Promise<Expense>;
  list(input: {
    tenantId: TenantId;
    from?: string;
    to?: string;
    categoryId?: string;
    currency?: string;
    paymentMethodKind?: 'cash' | 'card' | 'transfer';
    limit: number;
  }): Promise<Expense[]>;
  listRecent(tenantId: TenantId, limit: number): Promise<Expense[]>;
  listByPeriod(tenantId: TenantId, from: string, to: string): Promise<Expense[]>;
}

export interface IncomeRepository {
  create(input: Omit<Income, 'id'>): Promise<Income>;
  list(input: {
    tenantId: TenantId;
    from?: string;
    to?: string;
    currency?: string;
    limit: number;
  }): Promise<Income[]>;
  listByPeriod(tenantId: TenantId, from: string, to: string): Promise<Income[]>;
}

export interface BudgetRepository {
  upsertMonthly(input: Omit<MonthlyBudget, 'id'>): Promise<MonthlyBudget>;
  listMonthly(tenantId: TenantId, month: string): Promise<MonthlyBudget[]>;
}

export interface WhatsAppMessageAuditRepository {
  reserve(input: {
    providerMessageId: string;
    fromPhoneNumber: string;
    message: string;
  }): Promise<boolean>;
  updateByProviderMessageId(providerMessageId: string, input: {
    tenantId?: string;
    userId?: string;
    parsingStatus: 'saved' | 'needs_confirmation' | 'unknown_user' | 'failed';
    expenseId?: string;
  }): Promise<void>;
  create(input: {
    providerMessageId?: string;
    tenantId?: string;
    userId?: string;
    fromPhoneNumber: string;
    message: string;
    parsingStatus: 'saved' | 'needs_confirmation' | 'unknown_user' | 'failed' | 'processing';
    expenseId?: string;
  }): Promise<void>;
}

export interface TokenService {
  signAccessToken(user: User): string;
  signRefreshToken(user: User): string;
  verifyAccessToken(token: string): { userId: string; tenantId: string };
  verifyRefreshToken(token: string): { userId: string; tenantId: string };
}

export interface WhatsAppProvider {
  sendText(toPhoneNumber: string, body: string): Promise<unknown>;
}

export interface MessageInterpreterPort {
  interpret(message: string, context: MessageInterpreterContext): Promise<InterpretedMessage>;
}

export interface Clock {
  now(): Date;
}
