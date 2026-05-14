import type { Expense, TenantId } from '../../domain/index.js';

export interface ExpenseRepository {
  create(input: Omit<Expense, 'id'>): Promise<Expense>;
  update(input: {
    tenantId: TenantId;
    expenseId: string;
    amount?: number;
    concept?: string;
    categoryId?: string;
    subcategoryId?: string | null;
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
}
