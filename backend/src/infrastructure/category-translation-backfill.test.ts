import { describe, expect, it, vi } from 'vitest';
import { backfillCategoryTranslations } from './db-backfill-category-translations.js';
import type { Category } from '../domain/index.js';

describe('backfillCategoryTranslations', () => {
  it('translates incomplete automatic rows and reports individual failures', async () => {
    const pending: Category[] = [
      category('dance', 'Dance'),
      { ...category('manual', 'Investments'), nameEs: 'Inversiones', nameEn: 'Investments', translationSource: 'manual' },
      category('failed', 'Untranslated')
    ];
    const updateTranslations = vi.fn().mockResolvedValue({
      ...category('dance', 'Dance'),
      nameEs: 'Baile',
      nameEn: 'Dance',
      translationSource: 'automatic'
    });
    const translator = {
      translate: vi.fn(async ({ name }: { name: string }) => {
        if (name === 'Dance') return { nameEs: 'Baile', nameEn: 'Dance' };
        return undefined;
      })
    };

    const summary = await backfillCategoryTranslations({
      categories: {
        listMissingTranslations: async () => pending,
        listByTenant: async () => pending,
        updateTranslations
      } as never,
      translator,
      batchSize: 25,
      concurrency: 3
    });

    expect(summary).toEqual({ translated: 1, skipped: 1, failed: 1 });
    expect(updateTranslations).toHaveBeenCalledWith({
      categoryId: 'dance',
      nameEs: 'Baile',
      nameEn: 'Dance',
      translationSource: 'automatic'
    });
  });
});

function category(id: string, name: string): Category {
  return {
    id,
    tenantId: 'tenant-1',
    financialAccountId: 'account-1',
    name,
    isDefault: false
  };
}
