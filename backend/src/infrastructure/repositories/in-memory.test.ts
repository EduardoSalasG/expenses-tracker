import { describe, expect, it } from 'vitest';
import { InMemoryCategoryRepository, InMemoryExpenseRepository } from './in-memory.js';
import {
  InMemoryBankOptionRepository,
  InMemoryIncomeRepository,
  InMemoryPaymentMethodOptionRepository
} from './in-memory.js';
import type {
  BankOptionRepository,
  PaymentMethodOptionRepository
} from '../../application/ports.js';

describe('InMemoryExpenseRepository installments', () => {
  it('returns only multi-installment expenses in upcoming installment totals', async () => {
    const repository = new InMemoryExpenseRepository();

    await repository.create({
      tenantId: 'tenant-1',
      userId: 'user-1',
      date: '2026-06-15T00:00:00.000Z',
      firstInstallmentDate: '2026-06-15T00:00:00.000Z',
      amount: 30000,
      currency: 'CLP',
      concept: 'Phone in installments',
      categoryId: 'cat-1',
      paymentMethod: { kind: 'card', bank: 'bci', cardType: 'credit' },
      installmentCount: 3
    });

    await repository.create({
      tenantId: 'tenant-1',
      userId: 'user-1',
      date: '2026-06-10T00:00:00.000Z',
      amount: 5000,
      currency: 'CLP',
      concept: 'Single payment expense',
      categoryId: 'cat-1',
      paymentMethod: { kind: 'cash' },
      installmentCount: 1
    });

    const rows = await repository.upcomingInstallmentsMonthlyTotalsByTenant('tenant-1', '2026-06', 6);

    expect(rows).toEqual([
      { periodKey: '2026-06', currency: 'CLP', total: 10000 },
      { periodKey: '2026-07', currency: 'CLP', total: 10000 },
      { periodKey: '2026-08', currency: 'CLP', total: 10000 }
    ]);
  });

  it('keeps expense allocations visible in recent expense projections', async () => {
    const repository = new InMemoryExpenseRepository();

    const created = await repository.create({
      tenantId: 'tenant-1',
      financialAccountId: 'account-1',
      userId: 'user-1',
      createdByUserId: 'user-1',
      paidByUserId: 'user-1',
      allocationMode: 'custom',
      allocations: [
        { owedByUserId: 'user-1', amount: 2000 },
        { owedByUserId: 'user-2', amount: 3000 }
      ],
      date: '2026-08-11T00:00:00.000Z',
      amount: 5000,
      currency: 'CLP',
      concept: 'Taxi',
      categoryId: 'cat-1',
      paymentMethod: { kind: 'transfer', bank: 'bci' },
      installmentCount: 1
    });

    const rows = await repository.listRecent('tenant-1', 'account-1', 5);

    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(created.id);
    expect(rows[0].allocationMode).toBe('custom');
    expect(rows[0].allocations).toEqual([
      expect.objectContaining({ owedByUserId: 'user-1', amount: 2000 }),
      expect.objectContaining({ owedByUserId: 'user-2', amount: 3000 })
    ]);
  });
});

describe('In-memory transaction filters', () => {
  it('combines scoped expense filters and matches concept without case sensitivity', async () => {
    const expenses = new InMemoryExpenseRepository();
    const tenantId = 'tenant-1';
    const financialAccountId = 'account-1';

    const matching = await expenses.create({
      tenantId,
      financialAccountId,
      userId: 'user-1',
      date: '2026-09-12T12:00:00.000Z',
      amount: 15000,
      currency: 'CLP',
      concept: 'Netflix Familiar',
      categoryId: 'other',
      subcategoryId: 'subscriptions',
      paymentMethodOptionId: 'visa-card',
      bankOptionId: 'long-bank',
      paymentMethod: { kind: 'card', bank: 'Banco de Prueba', cardType: 'credit' }
    });
    await expenses.create({
      tenantId,
      financialAccountId,
      userId: 'user-1',
      date: '2026-09-12T12:00:00.000Z',
      amount: 9000,
      currency: 'CLP',
      concept: 'Spotify Familiar',
      categoryId: 'other',
      subcategoryId: 'subscriptions',
      paymentMethodOptionId: 'visa-card',
      bankOptionId: 'long-bank',
      paymentMethod: { kind: 'card', bank: 'Banco de Prueba', cardType: 'credit' }
    });
    await expenses.create({
      tenantId,
      financialAccountId: 'other-account',
      userId: 'user-1',
      date: '2026-09-12T12:00:00.000Z',
      amount: 15000,
      currency: 'CLP',
      concept: 'Netflix Familiar',
      categoryId: 'other',
      subcategoryId: 'subscriptions',
      paymentMethodOptionId: 'visa-card',
      bankOptionId: 'long-bank',
      paymentMethod: { kind: 'card', bank: 'Banco de Prueba', cardType: 'credit' }
    });

    await expect(expenses.list({
      tenantId,
      financialAccountId,
      concept: 'NETFLIX',
      subcategoryId: 'subscriptions',
      paymentMethodOptionId: 'visa-card',
      bankOptionId: 'long-bank',
      limit: 10
    })).resolves.toEqual([expect.objectContaining({ id: matching.id })]);
  });

  it('matches income concept without case sensitivity within the active account', async () => {
    const incomes = new InMemoryIncomeRepository();
    const matching = await incomes.create({
      tenantId: 'tenant-1',
      financialAccountId: 'account-1',
      userId: 'user-1',
      date: '2026-09-12T12:00:00.000Z',
      amount: 100000,
      currency: 'CLP',
      concept: 'Sueldo Septiembre'
    });
    await incomes.create({
      tenantId: 'tenant-1',
      financialAccountId: 'account-1',
      userId: 'user-1',
      date: '2026-09-12T12:00:00.000Z',
      amount: 10000,
      currency: 'CLP',
      concept: 'Devolución'
    });
    await incomes.create({
      tenantId: 'tenant-1',
      financialAccountId: 'other-account',
      userId: 'user-1',
      date: '2026-09-12T12:00:00.000Z',
      amount: 100000,
      currency: 'CLP',
      concept: 'Sueldo Septiembre'
    });

    await expect(incomes.list({
      tenantId: 'tenant-1',
      financialAccountId: 'account-1',
      concept: 'sueldo',
      limit: 10
    })).resolves.toEqual([expect.objectContaining({ id: matching.id })]);
  });
});

describe('In-memory finance repository account isolation', () => {
  it('rejects every foreign-account financial mutation within the same tenant', async () => {
    const tenantId = 'tenant-1';
    const sourceAccountId = 'account-source';
    const foreignAccountId = 'account-foreign';
    const expenses = new InMemoryExpenseRepository();
    const incomes = new InMemoryIncomeRepository();
    const banks: BankOptionRepository = new InMemoryBankOptionRepository();
    const paymentMethods: PaymentMethodOptionRepository = new InMemoryPaymentMethodOptionRepository();

    const expense = await expenses.create({
      tenantId,
      financialAccountId: sourceAccountId,
      userId: 'user-1',
      date: '2026-09-16T00:00:00.000Z',
      amount: 1000,
      currency: 'CLP',
      concept: 'Expense source',
      categoryId: 'category-1',
      paymentMethod: { kind: 'cash' }
    });
    const income = await incomes.create({
      tenantId,
      financialAccountId: sourceAccountId,
      userId: 'user-1',
      date: '2026-09-16T00:00:00.000Z',
      amount: 2000,
      currency: 'CLP',
      concept: 'Income source'
    });
    const bank = await banks.create({ tenantId, financialAccountId: sourceAccountId, name: 'Bank source', isDefault: false });
    const paymentMethod = await paymentMethods.create({
      tenantId,
      financialAccountId: sourceAccountId,
      code: 'source-card',
      name: 'Card source',
      kind: 'card',
      cardType: 'credit',
      isDefault: false
    });

    await expect(expenses.update({
      tenantId,
      financialAccountId: foreignAccountId,
      expenseId: expense.id,
      concept: 'tampered'
    })).resolves.toBeUndefined();
    await expect(expenses.delete({ tenantId, financialAccountId: foreignAccountId, expenseId: expense.id })).resolves.toBe(false);
    await expect(incomes.update({
      tenantId,
      financialAccountId: foreignAccountId,
      incomeId: income.id,
      concept: 'tampered'
    })).resolves.toBeUndefined();
    await expect(incomes.delete({ tenantId, financialAccountId: foreignAccountId, incomeId: income.id })).resolves.toBe(false);
    await expect(banks.update({
      tenantId,
      financialAccountId: foreignAccountId,
      bankOptionId: bank.id,
      name: 'tampered'
    })).resolves.toBeUndefined();
    await expect(banks.delete({
      tenantId,
      financialAccountId: foreignAccountId,
      bankOptionId: bank.id
    })).resolves.toBe(false);
    await expect(paymentMethods.update({
      tenantId,
      financialAccountId: foreignAccountId,
      paymentMethodOptionId: paymentMethod.id,
      code: 'tampered',
      name: 'tampered',
      kind: 'card',
      cardType: 'credit'
    })).resolves.toBeUndefined();
    await expect(paymentMethods.delete({
      tenantId,
      financialAccountId: foreignAccountId,
      paymentMethodOptionId: paymentMethod.id
    })).resolves.toBe(false);

    expect((await expenses.findById({ tenantId, financialAccountId: sourceAccountId, expenseId: expense.id }))?.concept).toBe('Expense source');
    expect((await incomes.list({ tenantId, financialAccountId: sourceAccountId, limit: 10 }))[0]?.concept).toBe('Income source');
    expect((await banks.findAccessibleById(tenantId, bank.id, sourceAccountId))?.name).toBe('Bank source');
    expect((await paymentMethods.findAccessibleById(tenantId, paymentMethod.id, sourceAccountId))?.name).toBe('Card source');
  });

  it('does not expose or mutate personal movements from a shared account in the same tenant', async () => {
    const tenantId = 'tenant-1';
    const sharedAccountId = 'shared-account';
    const expenses = new InMemoryExpenseRepository();
    const incomes = new InMemoryIncomeRepository();
    const personalExpense = await expenses.create({
      tenantId,
      userId: 'user-1',
      date: '2026-09-16T00:00:00.000Z',
      amount: 1000,
      currency: 'CLP',
      concept: 'personal expense',
      categoryId: 'category-1',
      paymentMethod: { kind: 'cash' }
    });
    const personalIncome = await incomes.create({
      tenantId,
      userId: 'user-1',
      date: '2026-09-16T00:00:00.000Z',
      amount: 2000,
      currency: 'CLP',
      concept: 'personal income'
    });

    await expect(expenses.findById({ tenantId, financialAccountId: sharedAccountId, expenseId: personalExpense.id })).resolves.toBeUndefined();
    await expect(expenses.update({
      tenantId,
      financialAccountId: sharedAccountId,
      expenseId: personalExpense.id,
      concept: 'tampered'
    })).resolves.toBeUndefined();
    await expect(expenses.delete({ tenantId, financialAccountId: sharedAccountId, expenseId: personalExpense.id })).resolves.toBe(false);
    await expect(incomes.list({ tenantId, financialAccountId: sharedAccountId, limit: 10 })).resolves.toEqual([]);
    await expect(incomes.update({
      tenantId,
      financialAccountId: sharedAccountId,
      incomeId: personalIncome.id,
      concept: 'tampered'
    })).resolves.toBeUndefined();
    await expect(incomes.delete({ tenantId, financialAccountId: sharedAccountId, incomeId: personalIncome.id })).resolves.toBe(false);
  });
});

describe('InMemoryCategoryRepository translations', () => {
  it('keeps manual translations when an automatic retry runs', async () => {
    const categories = new InMemoryCategoryRepository();
    const category = await categories.create({
      tenantId: 'tenant-1',
      financialAccountId: 'account-1',
      name: 'Dance',
      isDefault: false
    });

    await categories.updateTranslations({
      categoryId: category.id,
      nameEs: 'Danza',
      nameEn: 'Dance',
      translationSource: 'manual'
    });
    await categories.updateTranslations({
      categoryId: category.id,
      nameEs: 'Baile',
      nameEn: 'Dance',
      translationSource: 'automatic'
    });

    expect((await categories.listByTenant('tenant-1', 'account-1'))[0]).toMatchObject({
      nameEs: 'Danza',
      translationSource: 'manual'
    });
  });
});
