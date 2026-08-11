import type { Category, TenantId } from '../../domain/index.js';

export interface CategoryRepository {
  listByTenant(tenantId: TenantId, financialAccountId?: string): Promise<Category[]>;
  create(input: Omit<Category, 'id'>): Promise<Category>;
  ensureDefaults(tenantId: TenantId): Promise<void>;
}
