import { pathToFileURL } from 'node:url';
import type { Category } from '../domain/index.js';
import type { CategoryRepository, CategoryTranslatorPort } from '../application/ports.js';
import { createPool } from './database.js';
import { loadConfig } from './config.js';
import { createLogger } from './logger.js';
import { createCategoryTranslator } from './category-translator.provider.js';
import { PostgresCategoryRepository } from './repositories/postgres.js';

export interface CategoryTranslationBackfillSummary {
  translated: number;
  skipped: number;
  failed: number;
}

export async function backfillCategoryTranslations(input: {
  categories: Pick<CategoryRepository, 'listByTenant' | 'listMissingTranslations' | 'updateTranslations'>;
  translator: CategoryTranslatorPort;
  batchSize?: number;
  concurrency?: number;
}): Promise<CategoryTranslationBackfillSummary> {
  const pending = await input.categories.listMissingTranslations(input.batchSize ?? 100);
  const parentNames = await parentNamesFor(pending, input.categories);
  const summary: CategoryTranslationBackfillSummary = { translated: 0, skipped: 0, failed: 0 };
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < pending.length) {
      const category = pending[nextIndex++];
      if (!category || shouldSkip(category)) {
        summary.skipped += 1;
        continue;
      }

      try {
        const translation = await input.translator.translate({
          name: category.name,
          parentName: category.parentId ? parentNames.get(category.id) : undefined,
          role: category.parentId ? 'subcategory' : 'root'
        });
        if (!translation) {
          summary.failed += 1;
          continue;
        }

        const updated = await input.categories.updateTranslations({
          categoryId: category.id,
          ...translation,
          translationSource: 'automatic'
        });
        if (updated) summary.translated += 1;
        else summary.failed += 1;
      } catch {
        summary.failed += 1;
      }
    }
  };

  const workers = Math.max(1, Math.min(input.concurrency ?? 3, pending.length));
  await Promise.all(Array.from({ length: workers }, worker));
  return summary;
}

function shouldSkip(category: Category) {
  return category.translationSource === 'manual' || Boolean(category.nameEs && category.nameEn);
}

async function parentNamesFor(
  categories: Category[],
  repository: Pick<CategoryRepository, 'listByTenant'>
) {
  const names = new Map<string, string>();
  const accountCategories = new Map<string, Category[]>();

  for (const category of categories.filter((item) => item.parentId)) {
    const key = `${category.tenantId}:${category.financialAccountId ?? ''}`;
    let available = accountCategories.get(key);
    if (!available) {
      available = await repository.listByTenant(category.tenantId, category.financialAccountId);
      accountCategories.set(key, available);
    }
    const parent = available.find((item) => item.id === category.parentId);
    if (parent) names.set(category.id, parent.name);
  }

  return names;
}

async function main() {
  const config = loadConfig();
  const logger = createLogger();
  const pool = createPool(config);

  try {
    const summary = await backfillCategoryTranslations({
      categories: new PostgresCategoryRepository(pool),
      translator: createCategoryTranslator(config, logger),
      batchSize: 100,
      concurrency: 3
    });
    logger.info('Category translation backfill completed.', summary);
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    const logger = createLogger();
    logger.error('Category translation backfill failed.', {
      error: error instanceof Error ? error.message : String(error)
    });
    process.exitCode = 1;
  });
}
