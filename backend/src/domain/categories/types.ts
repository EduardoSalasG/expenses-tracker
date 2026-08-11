import type { FinancialAccountId } from '../financial-accounts/index.js';
import type { TenantId } from '../tenancy/index.js';

export type CategoryId = string;

export interface Category {
  id: CategoryId;
  tenantId: TenantId;
  financialAccountId?: FinancialAccountId;
  name: string;
  parentId?: CategoryId;
  isDefault: boolean;
}
