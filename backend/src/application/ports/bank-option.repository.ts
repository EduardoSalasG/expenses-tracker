import type { BankOption, TenantId } from '../../domain/index.js';

export interface BankOptionRepository {
  listByTenant(tenantId: TenantId, financialAccountId?: string): Promise<BankOption[]>;
  findAccessibleById(tenantId: TenantId, bankOptionId: string, financialAccountId?: string): Promise<BankOption | undefined>;
  create(input: Omit<BankOption, 'id'>): Promise<BankOption>;
  update(input: { tenantId: TenantId; bankOptionId: string; name: string }): Promise<BankOption | undefined>;
  delete(input: { tenantId: TenantId; bankOptionId: string }): Promise<boolean>;
}
