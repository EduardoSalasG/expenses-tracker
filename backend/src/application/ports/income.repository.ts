import type { Income, TenantId } from '../../domain/types.js';

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
