import { describe, expect, it, vi } from 'vitest';
import { FinanceUseCases } from './use-cases/finance.use-cases.js';
import { InMemoryBudgetRepository, InMemoryCategoryRepository, InMemoryExpenseRepository, InMemoryIncomeRepository } from '../infrastructure/repositories/in-memory.js';

describe('FinanceUseCases category translations', () => {
  it('creates a category when translation is unavailable', async () => {
    const categories = new InMemoryCategoryRepository();
    const translations = { localize: vi.fn(async (category) => category) };
    const finance = new FinanceUseCases(
      new InMemoryExpenseRepository(),
      new InMemoryIncomeRepository(),
      new InMemoryBudgetRepository(),
      categories,
      undefined,
      undefined,
      undefined,
      translations
    );

    const created = await finance.createCategory({
      tenantId: 'tenant-1',
      financialAccountId: 'account-1',
      name: 'Investments',
      isDefault: false
    });

    expect(created).toMatchObject({ name: 'Investments' });
    expect(created).not.toHaveProperty('nameEs');
    expect(translations.localize).toHaveBeenCalledWith(created, undefined);
  });

  it('persists labels returned by the shared translation service', async () => {
    const categories = new InMemoryCategoryRepository();
    const finance = new FinanceUseCases(
      new InMemoryExpenseRepository(),
      new InMemoryIncomeRepository(),
      new InMemoryBudgetRepository(),
      categories,
      undefined,
      undefined,
      undefined,
      {
        localize: vi.fn(async (category) => (
          await categories.updateTranslations({
            categoryId: category.id,
            nameEs: 'Inversiones',
            nameEn: 'Investments',
            translationSource: 'automatic'
          }) ?? category
        ))
      }
    );

    await expect(finance.createCategory({
      tenantId: 'tenant-1',
      financialAccountId: 'account-1',
      name: 'Investments',
      isDefault: false
    })).resolves.toMatchObject({ nameEs: 'Inversiones', nameEn: 'Investments' });
  });
});
