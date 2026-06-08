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
  update(input: {
    tenantId: TenantId;
    expenseId: string;
    date?: string;
    amount?: number;
    concept?: string;
    categoryId?: string;
    subcategoryId?: string | null;
    paymentMethod?: Expense['paymentMethod'];
  }): Promise<Expense | undefined>;
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
  yearlyMonthlyTotalsByTenant(tenantId: TenantId, year: number): Promise<CurrencyTotalByPeriod[]>;
  monthlyDailyTotalsByTenant(tenantId: TenantId, month: string): Promise<CurrencyTotalByPeriod[]>;
  weeklyDailyTotalsByTenant(tenantId: TenantId, weekStartIsoDate: string): Promise<CurrencyTotalByPeriod[]>;
  periodCategoryTotalsByTenant(tenantId: TenantId, from: string, to: string): Promise<CategoryTotalByPeriod[]>;
}
