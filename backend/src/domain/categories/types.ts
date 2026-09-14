import type { FinancialAccountId } from '../financial-accounts/index.js';
import type { TenantId } from '../tenancy/index.js';

export type CategoryId = string;
export type CategoryTranslationSource = 'system' | 'automatic' | 'manual';

export interface Category {
  id: CategoryId;
  tenantId: TenantId;
  financialAccountId?: FinancialAccountId;
  name: string;
  nameEs?: string;
  nameEn?: string;
  translationSource?: CategoryTranslationSource;
  parentId?: CategoryId;
  isDefault: boolean;
}
