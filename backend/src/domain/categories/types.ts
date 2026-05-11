import type { TenantId } from '../tenancy/index.js';

export type CategoryId = string;

export interface Category {
  id: CategoryId;
  tenantId: TenantId;
  name: string;
  parentId?: CategoryId;
  isDefault: boolean;
}
