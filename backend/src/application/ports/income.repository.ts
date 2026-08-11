import type { Income, TenantId } from '../../domain/index.js';
import type { CurrencyTotalByPeriod } from './expense.repository.js';

export interface IncomeRepository {
  create(input: Omit<Income, 'id'>): Promise<Income>;
  delete(input: {
    tenantId: TenantId;
    financialAccountId?: string;
    incomeId: string;
  }): Promise<boolean>;
  update(input: {
    tenantId: TenantId;
    financialAccountId?: string;
    incomeId: string;
    date?: string;
    amount?: number;
    currency?: string;
    concept?: string;
  }): Promise<Income | undefined>;
  list(input: {
    tenantId: TenantId;
    financialAccountId?: string;
    from?: string;
    to?: string;
    currency?: string;
    limit: number;
  }): Promise<Income[]>;
  listByPeriod(tenantId: TenantId, financialAccountIdOrFrom: string | undefined, fromOrTo?: string, to?: string): Promise<Income[]>;
  listRecent(tenantId: TenantId, financialAccountIdOrLimit?: string | number, limit?: number): Promise<Income[]>;
  yearlyMonthlyTotalsByTenant(tenantId: TenantId, financialAccountId: string | undefined, year: number): Promise<CurrencyTotalByPeriod[]>;
  monthlyDailyTotalsByTenant(tenantId: TenantId, financialAccountId: string | undefined, month: string): Promise<CurrencyTotalByPeriod[]>;
}
