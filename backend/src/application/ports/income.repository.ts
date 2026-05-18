import type { Income, TenantId } from '../../domain/index.js';
import type { CurrencyTotalByPeriod } from './expense.repository.js';

export interface IncomeRepository {
  create(input: Omit<Income, 'id'>): Promise<Income>;
  update(input: {
    tenantId: TenantId;
    incomeId: string;
    amount?: number;
    concept?: string;
  }): Promise<Income | undefined>;
  list(input: {
    tenantId: TenantId;
    from?: string;
    to?: string;
    currency?: string;
    limit: number;
  }): Promise<Income[]>;
  listByPeriod(tenantId: TenantId, from: string, to: string): Promise<Income[]>;
  listRecent(tenantId: TenantId, limit: number): Promise<Income[]>;
  yearlyMonthlyTotalsByTenant(tenantId: TenantId, year: number): Promise<CurrencyTotalByPeriod[]>;
  monthlyDailyTotalsByTenant(tenantId: TenantId, month: string): Promise<CurrencyTotalByPeriod[]>;
}
