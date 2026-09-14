import type { Category, CategoryTranslationSource, TenantId } from '../../domain/index.js';

export interface CategoryRepository {
  listByTenant(tenantId: TenantId, financialAccountId?: string): Promise<Category[]>;
  create(input: Omit<Category, 'id'>): Promise<Category>;
  updateTranslations(input: {
    categoryId: string;
    nameEs: string;
    nameEn: string;
    translationSource: CategoryTranslationSource;
  }): Promise<Category | undefined>;
  listMissingTranslations(limit: number): Promise<Category[]>;
  ensureDefaults(tenantId: TenantId): Promise<void>;
}
