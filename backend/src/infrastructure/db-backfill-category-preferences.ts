import { pathToFileURL } from 'node:url';
import type { CategoryPreferenceService } from '../application/services/category-preference.service.js';
import type { DatabasePool } from './database.js';
import { createPool } from './database.js';
import { loadConfig } from './config.js';
import { createLogger } from './logger.js';
import { PostgresCategoryPreferenceRepository } from './repositories/postgres.js';

type HistoricalExpense = {
  financial_account_id: string;
  concept: string;
  category_id: string;
  subcategory_id: string | null;
};

export interface CategoryPreferenceBackfillSummary {
  groupsRead: number;
  preferencesCreated: number;
  evidenceRecorded: number;
  ignoredAmbiguousGroups: number;
  ignoredInsufficientGroups: number;
}

export async function backfillCategoryPreferences(input: {
  pool: Pick<DatabasePool, 'query'>;
  preferences: Pick<CategoryPreferenceService, 'normalizeSignal' | 'recordConfirmedSelection' | 'resolve'>;
}): Promise<CategoryPreferenceBackfillSummary> {
  const historicalExpenses = await input.pool.query<HistoricalExpense>(`
    select financial_account_id, concept, category_id, subcategory_id
    from expenses
    where financial_account_id is not null
    order by financial_account_id, expense_date, id
  `);
  const groups = new Map<string, {
    financialAccountId: string;
    signal: string;
    selections: Map<string, { categoryId: string; subcategoryId?: string; count: number }>;
  }>();

  for (const expense of historicalExpenses.rows) {
    let signal: string;
    try {
      signal = input.preferences.normalizeSignal(expense.concept);
    } catch {
      continue;
    }
    const groupKey = JSON.stringify([expense.financial_account_id, signal]);
    const group = groups.get(groupKey) ?? {
      financialAccountId: expense.financial_account_id,
      signal,
      selections: new Map()
    };
    const selectionKey = JSON.stringify([expense.category_id, expense.subcategory_id]);
    const selection = group.selections.get(selectionKey) ?? {
      categoryId: expense.category_id,
      subcategoryId: expense.subcategory_id ?? undefined,
      count: 0
    };
    selection.count += 1;
    group.selections.set(selectionKey, selection);
    groups.set(groupKey, group);
  }

  const summary: CategoryPreferenceBackfillSummary = {
    groupsRead: groups.size,
    preferencesCreated: 0,
    evidenceRecorded: 0,
    ignoredAmbiguousGroups: 0,
    ignoredInsufficientGroups: 0
  };

  for (const group of groups.values()) {
    if (group.selections.size !== 1) {
      summary.ignoredAmbiguousGroups += 1;
      continue;
    }
    const selection = [...group.selections.values()][0];
    if (selection.count < 3) {
      summary.ignoredInsufficientGroups += 1;
      continue;
    }

    const existing = await input.preferences.resolve({
      financialAccountId: group.financialAccountId,
      concept: group.signal
    });
    const recordedEvidence = await input.pool.query<{ evidence_count: number }>(
      `select evidence_count
       from financial_account_category_preference_evidence
       where financial_account_id = $1
         and signal = $2
         and category_id = $3
         and subcategory_id is not distinct from $4::uuid`,
      [group.financialAccountId, group.signal, selection.categoryId, selection.subcategoryId ?? null]
    );
    const missingEvidence = Math.max(0, selection.count - Number(recordedEvidence.rows[0]?.evidence_count ?? 0));
    for (let index = 0; index < missingEvidence; index += 1) {
      await input.preferences.recordConfirmedSelection({
        financialAccountId: group.financialAccountId,
        concept: group.signal,
        categoryId: selection.categoryId,
        subcategoryId: selection.subcategoryId,
        explicit: false
      });
    }
    summary.evidenceRecorded += missingEvidence;
    if (!existing && missingEvidence > 0) {
      const resolved = await input.preferences.resolve({
        financialAccountId: group.financialAccountId,
        concept: group.signal
      });
      if (resolved?.source === 'historical_consensus') summary.preferencesCreated += 1;
    }
  }

  return summary;
}

async function main() {
  const config = loadConfig();
  const logger = createLogger();
  const pool = createPool(config);
  try {
    const repository = new PostgresCategoryPreferenceRepository(pool);
    const { CategoryPreferenceService } = await import('../application/services/category-preference.service.js');
    const summary = await backfillCategoryPreferences({
      pool,
      preferences: new CategoryPreferenceService(repository)
    });
    logger.info('Category preference backfill completed.', summary);
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    createLogger().error('Category preference backfill failed.', {
      error: error instanceof Error ? error.message : String(error)
    });
    process.exitCode = 1;
  });
}
