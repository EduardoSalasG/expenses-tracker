import type { Category, TenantId } from '../../domain/types.js';

export interface CategoryRepository {
  listByTenant(tenantId: TenantId): Promise<Category[]>;
  create(input: Omit<Category, 'id'>): Promise<Category>;
  ensureDefaults(tenantId: TenantId): Promise<void>;
}
