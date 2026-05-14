import type { Income, TenantId } from '../../domain/index.js';

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
}
