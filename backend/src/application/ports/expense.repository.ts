import type { Expense, TenantId } from '../../domain/index.js';

export interface CurrencyTotalByPeriod {
  periodKey: string;
  currency: string;
  total: number;
}

export interface CategoryTotalByPeriod {
  categoryId: string;
  subcategoryId?: string;
  currency: string;
  total: number;
}

export interface ExpenseRepository {
  create(input: Omit<Expense, 'id'>): Promise<Expense>;
  findById(input: {
    tenantId: TenantId;
    financialAccountId?: string;
    expenseId: string;
  }): Promise<Expense | undefined>;
  delete(input: {
    tenantId: TenantId;
    financialAccountId?: string;
    expenseId: string;
  }): Promise<boolean>;
  update(input: {
    tenantId: TenantId;
    financialAccountId?: string;
    expenseId: string;
    date?: string;
    amount?: number;
    currency?: string;
    concept?: string;
    categoryId?: string;
    subcategoryId?: string | null;
    paymentMethodOptionId?: string | null;
    bankOptionId?: string | null;
    paidByUserId?: string;
    allocationMode?: Expense['allocationMode'];
    allocations?: Array<{ owedByUserId: string; amount: number }>;
    installmentCount?: number;
    firstInstallmentDate?: string | null;
    paymentMethod?: Expense['paymentMethod'];
  }): Promise<Expense | undefined>;
  list(input: {
    tenantId: TenantId;
    financialAccountId?: string;
    from?: string;
    to?: string;
    categoryId?: string;
    currency?: string;
    paymentMethodKind?: 'cash' | 'card' | 'transfer';
    limit: number;
  }): Promise<Expense[]>;
  listRecent(tenantId: TenantId, financialAccountIdOrLimit?: string | number, limit?: number): Promise<Expense[]>;
  listByPeriod(tenantId: TenantId, financialAccountIdOrFrom: string | undefined, fromOrTo?: string, to?: string): Promise<Expense[]>;
  yearlyMonthlyTotalsByTenant(tenantId: TenantId, financialAccountId: string | undefined, year: number): Promise<CurrencyTotalByPeriod[]>;
  monthlyDailyTotalsByTenant(tenantId: TenantId, financialAccountId: string | undefined, month: string): Promise<CurrencyTotalByPeriod[]>;
  weeklyDailyTotalsByTenant(tenantId: TenantId, financialAccountId: string | undefined, weekStartIsoDate: string): Promise<CurrencyTotalByPeriod[]>;
  upcomingInstallmentsMonthlyTotalsByTenant(tenantId: TenantId, financialAccountIdOrStartMonth: string | undefined, startMonthOrMonths?: string | number, months?: number): Promise<CurrencyTotalByPeriod[]>;
  periodCategoryTotalsByTenant(tenantId: TenantId, financialAccountId: string | undefined, from: string, to: string): Promise<CategoryTotalByPeriod[]>;
}
