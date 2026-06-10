import type { BankOption, TenantId } from '../../domain/index.js';

export interface BankOptionRepository {
  listByTenant(tenantId: TenantId): Promise<BankOption[]>;
  findAccessibleById(tenantId: TenantId, bankOptionId: string): Promise<BankOption | undefined>;
  create(input: Omit<BankOption, 'id'>): Promise<BankOption>;
}
