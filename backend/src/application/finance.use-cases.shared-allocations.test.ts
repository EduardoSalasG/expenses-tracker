import { describe, expect, it } from 'vitest';
import { FinanceUseCases } from './use-cases/finance.use-cases.js';
import { FinancialAccountsUseCases } from './use-cases/financial-accounts.use-cases.js';
import {
  InMemoryBankOptionRepository,
  InMemoryBudgetRepository,
  InMemoryCategoryRepository,
  InMemoryExpenseRepository,
  InMemoryFinancialAccountRepository,
  InMemoryIncomeRepository,
  InMemoryPaymentMethodOptionRepository,
  InMemoryUserRepository
} from '../infrastructure/repositories/in-memory.js';

describe('FinanceUseCases shared allocations', () => {
  it('creates equal allocations for every active shared-account member', async () => {
    const users = new InMemoryUserRepository();
    const financialAccounts = new InMemoryFinancialAccountRepository(users);
    const categories = new InMemoryCategoryRepository();
    const expenses = new InMemoryExpenseRepository();
    const finance = new FinanceUseCases(
      expenses,
      new InMemoryIncomeRepository(),
      new InMemoryBudgetRepository(),
      categories,
      new InMemoryBankOptionRepository(),
      new InMemoryPaymentMethodOptionRepository(),
      financialAccounts
    );
    const financialAccountUseCases = new FinancialAccountsUseCases(
      financialAccounts,
      categories,
      new InMemoryBudgetRepository(),
      new InMemoryBankOptionRepository(),
      new InMemoryPaymentMethodOptionRepository(),
      users
    );

    const owner = await users.upsertByPhoneNumber({
      phoneNumber: '+56911111111',
      firstName: 'Owner',
      lastName: 'User',
      preferredName: 'Owner',
      countryOfResidence: 'Chile',
      preferredCurrency: 'CLP',
      preferredLanguage: 'es'
    });
    const member = await users.upsertByPhoneNumber({
      phoneNumber: '+56922222222',
      firstName: 'Member',
      lastName: 'User',
      preferredName: 'Member',
      countryOfResidence: 'Chile',
      preferredCurrency: 'CLP',
      preferredLanguage: 'es'
    });

    const personal = await financialAccounts.ensurePersonalAccount(owner.id);
    const shared = await financialAccountUseCases.createSharedAccount({
      userId: owner.id,
      tenantId: owner.tenantId,
      sourceFinancialAccountId: personal.id,
      name: 'Casa',
      currency: 'CLP'
    });
    await financialAccounts.upsertMember({
      financialAccountId: shared.account.id,
      userId: member.id,
      role: 'member',
      status: 'active'
    });

    const category = await categories.create({
      tenantId: owner.tenantId,
      financialAccountId: shared.account.id,
      name: 'Food',
      isDefault: false
    });

    const expense = await finance.createExpense({
      tenantId: owner.tenantId,
      financialAccountId: shared.account.id,
      userId: owner.id,
      createdByUserId: owner.id,
      date: '2026-08-11T00:00:00.000Z',
      amount: 9000,
      currency: 'CLP',
      concept: 'Cena',
      categoryId: category.id,
      allocationMode: 'equal',
      paymentMethod: { kind: 'transfer', bank: 'bci' }
    });

    expect(expense.allocationMode).toBe('equal');
    expect(expense.allocations).toEqual([
      expect.objectContaining({ owedByUserId: owner.id, amount: 4500 }),
      expect.objectContaining({ owedByUserId: member.id, amount: 4500 })
    ]);
  });

  it('rescales existing custom allocations when amount changes without a new split payload', async () => {
    const users = new InMemoryUserRepository();
    const financialAccounts = new InMemoryFinancialAccountRepository(users);
    const categories = new InMemoryCategoryRepository();
    const expenses = new InMemoryExpenseRepository();
    const finance = new FinanceUseCases(
      expenses,
      new InMemoryIncomeRepository(),
      new InMemoryBudgetRepository(),
      categories,
      new InMemoryBankOptionRepository(),
      new InMemoryPaymentMethodOptionRepository(),
      financialAccounts
    );
    const financialAccountUseCases = new FinancialAccountsUseCases(
      financialAccounts,
      categories,
      new InMemoryBudgetRepository(),
      new InMemoryBankOptionRepository(),
      new InMemoryPaymentMethodOptionRepository(),
      users
    );

    const owner = await users.upsertByPhoneNumber({
      phoneNumber: '+56911111111',
      firstName: 'Owner',
      lastName: 'User',
      preferredName: 'Owner',
      countryOfResidence: 'Chile',
      preferredCurrency: 'CLP',
      preferredLanguage: 'es'
    });
    const member = await users.upsertByPhoneNumber({
      phoneNumber: '+56922222222',
      firstName: 'Member',
      lastName: 'User',
      preferredName: 'Member',
      countryOfResidence: 'Chile',
      preferredCurrency: 'CLP',
      preferredLanguage: 'es'
    });

    const personal = await financialAccounts.ensurePersonalAccount(owner.id);
    const shared = await financialAccountUseCases.createSharedAccount({
      userId: owner.id,
      tenantId: owner.tenantId,
      sourceFinancialAccountId: personal.id,
      name: 'Viaje',
      currency: 'CLP'
    });
    await financialAccounts.upsertMember({
      financialAccountId: shared.account.id,
      userId: member.id,
      role: 'member',
      status: 'active'
    });

    const category = await categories.create({
      tenantId: owner.tenantId,
      financialAccountId: shared.account.id,
      name: 'Transport',
      isDefault: false
    });

    const created = await finance.createExpense({
      tenantId: owner.tenantId,
      financialAccountId: shared.account.id,
      userId: owner.id,
      createdByUserId: owner.id,
      paidByUserId: owner.id,
      date: '2026-08-11T00:00:00.000Z',
      amount: 3000,
      currency: 'CLP',
      concept: 'Taxi',
      categoryId: category.id,
      allocationMode: 'custom',
      allocations: [
        { owedByUserId: owner.id, amount: 1000 },
        { owedByUserId: member.id, amount: 2000 }
      ],
      paymentMethod: { kind: 'cash' }
    });

    const updated = await finance.updateExpense({
      tenantId: owner.tenantId,
      financialAccountId: shared.account.id,
      expenseId: created.id,
      userId: owner.id,
      date: created.date,
      amount: 6000,
      currency: created.currency,
      concept: created.concept,
      categoryId: created.categoryId,
      subcategoryId: created.subcategoryId,
      paymentMethod: created.paymentMethod
    });

    expect(updated.allocationMode).toBe('custom');
    expect(updated.allocations).toEqual([
      expect.objectContaining({ owedByUserId: owner.id, amount: 2000 }),
      expect.objectContaining({ owedByUserId: member.id, amount: 4000 })
    ]);
  });
});
