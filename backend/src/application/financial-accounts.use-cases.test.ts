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
import type { EmailProvider } from './ports.js';

describe('FinancialAccountsUseCases', () => {
  it('creates a shared account by cloning account-scoped categories, budgets, banks, and payment methods', async () => {
    const users = new InMemoryUserRepository();
    const financialAccounts = new InMemoryFinancialAccountRepository(users);
    const categories = new InMemoryCategoryRepository();
    const budgets = new InMemoryBudgetRepository();
    const banks = new InMemoryBankOptionRepository();
    const paymentMethods = new InMemoryPaymentMethodOptionRepository();
    const useCases = new FinancialAccountsUseCases(financialAccounts, categories, budgets, banks, paymentMethods, users);

    const user = await users.upsertByPhoneNumber({
      phoneNumber: '+56911111111',
      firstName: 'Eduardo',
      lastName: 'Salas',
      preferredName: 'Eduardo',
      countryOfResidence: 'Chile',
      preferredCurrency: 'CLP',
      email: 'eduardo@example.com',
      preferredLanguage: 'es'
    });

    const personal = await financialAccounts.ensurePersonalAccount(user.id);

    const pets = await categories.create({
      tenantId: user.tenantId,
      financialAccountId: personal.id,
      name: 'Pets',
      isDefault: false
    });
    const veterinary = await categories.create({
      tenantId: user.tenantId,
      financialAccountId: personal.id,
      name: 'Veterinary',
      parentId: pets.id,
      isDefault: false
    });

    await budgets.upsertMonthly({
      tenantId: user.tenantId,
      financialAccountId: personal.id,
      categoryId: pets.id,
      subcategoryId: veterinary.id,
      amount: 120000,
      currency: 'CLP'
    });

    await banks.create({
      tenantId: user.tenantId,
      financialAccountId: personal.id,
      name: 'Banco de prueba',
      isDefault: false
    });

    await paymentMethods.create({
      tenantId: user.tenantId,
      financialAccountId: personal.id,
      code: 'custom_credit',
      name: 'Tarjeta favorita',
      kind: 'card',
      cardType: 'credit',
      isDefault: false
    });

    const created = await useCases.createSharedAccount({
      userId: user.id,
      tenantId: user.tenantId,
      sourceFinancialAccountId: personal.id,
      name: 'Casa',
      currency: 'CLP'
    });

    expect(created.account.type).toBe('shared');
    expect(created.role).toBe('owner');

    const sharedCategories = (await categories.listByTenant(user.tenantId, created.account.id))
      .filter((category) => category.financialAccountId === created.account.id);
    const sharedPets = sharedCategories.find((category) => category.name === 'Pets' && !category.parentId);
    const sharedVeterinary = sharedCategories.find((category) => category.name === 'Veterinary' && category.parentId === sharedPets?.id);

    expect(sharedPets).toBeDefined();
    expect(sharedVeterinary).toBeDefined();

    const sharedBudgets = await budgets.listMonthly(user.tenantId, created.account.id);
    expect(sharedBudgets).toHaveLength(1);
    expect(sharedBudgets[0].categoryId).toBe(sharedPets?.id);
    expect(sharedBudgets[0].subcategoryId).toBe(sharedVeterinary?.id);

    const sharedBanks = await banks.listByTenant(user.tenantId, created.account.id);
    expect(sharedBanks.some((bank) => bank.name === 'Banco de prueba' && bank.financialAccountId === created.account.id)).toBe(true);
    expect(sharedBanks.filter((bank) => bank.isDefault)).toHaveLength(13);

    const sharedPaymentMethods = await paymentMethods.listByTenant(user.tenantId, created.account.id);
    expect(sharedPaymentMethods.some((method) => method.name === 'Tarjeta favorita' && method.financialAccountId === created.account.id)).toBe(true);
    expect(sharedPaymentMethods.filter((method) => method.isDefault).map((method) => method.code).sort()).toEqual([
      'cash',
      'credit_card',
      'debit_card',
      'transfer'
    ]);
  });

  it('reuses system default categories instead of duplicating scoped categories with the same names', async () => {
    const users = new InMemoryUserRepository();
    const financialAccounts = new InMemoryFinancialAccountRepository(users);
    const categories = new InMemoryCategoryRepository();
    const budgets = new InMemoryBudgetRepository();
    const banks = new InMemoryBankOptionRepository();
    const paymentMethods = new InMemoryPaymentMethodOptionRepository();
    const useCases = new FinancialAccountsUseCases(financialAccounts, categories, budgets, banks, paymentMethods, users);

    const user = await users.upsertByPhoneNumber({
      phoneNumber: '+56911111112',
      firstName: 'Eduardo',
      lastName: 'Salas',
      preferredName: 'Eduardo',
      countryOfResidence: 'Chile',
      preferredCurrency: 'CLP',
      email: 'eduardo+defaults@example.com',
      preferredLanguage: 'es'
    });

    await categories.ensureDefaults(user.tenantId);
    const personal = await financialAccounts.ensurePersonalAccount(user.id);

    const scopedFood = await categories.create({
      tenantId: user.tenantId,
      financialAccountId: personal.id,
      name: 'Food',
      isDefault: false
    });
    const scopedRestaurants = await categories.create({
      tenantId: user.tenantId,
      financialAccountId: personal.id,
      name: 'Restaurants',
      parentId: scopedFood.id,
      isDefault: false
    });

    await budgets.upsertMonthly({
      tenantId: user.tenantId,
      financialAccountId: personal.id,
      categoryId: scopedFood.id,
      subcategoryId: scopedRestaurants.id,
      amount: 80000,
      currency: 'CLP'
    });

    const created = await useCases.createSharedAccount({
      userId: user.id,
      tenantId: user.tenantId,
      sourceFinancialAccountId: personal.id,
      name: 'Casa',
      currency: 'CLP'
    });

    const sharedCategories = await categories.listByTenant(user.tenantId, created.account.id);
    expect(sharedCategories.filter((category) =>
      category.financialAccountId === created.account.id && category.name === 'Food'
    )).toHaveLength(0);
    expect(sharedCategories.filter((category) =>
      category.financialAccountId === created.account.id && category.name === 'Restaurants'
    )).toHaveLength(0);

    const defaultFood = sharedCategories.find((category) => !category.financialAccountId && category.name === 'Food');
    const defaultRestaurants = sharedCategories.find((category) =>
      !category.financialAccountId && category.name === 'Restaurants' && category.parentId === defaultFood?.id
    );

    expect(defaultFood).toBeDefined();
    expect(defaultRestaurants).toBeDefined();

    const sharedBudgets = await budgets.listMonthly(user.tenantId, created.account.id);
    expect(sharedBudgets).toHaveLength(1);
    expect(sharedBudgets[0].categoryId).toBe(defaultFood?.id);
    expect(sharedBudgets[0].subcategoryId).toBe(defaultRestaurants?.id);
  });

  it('accepts invitations only for the invited email or phone and activates membership', async () => {
    const users = new InMemoryUserRepository();
    const financialAccounts = new InMemoryFinancialAccountRepository(users);
    const useCases = new FinancialAccountsUseCases(
      financialAccounts,
      new InMemoryCategoryRepository(),
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
      email: 'owner@example.com',
      preferredLanguage: 'es'
    });
    const invited = await users.upsertByPhoneNumber({
      phoneNumber: '+56922222222',
      firstName: 'Invited',
      lastName: 'User',
      preferredName: 'Invited',
      countryOfResidence: 'Chile',
      preferredCurrency: 'CLP',
      email: 'invited@example.com',
      preferredLanguage: 'es'
    });
    const outsider = await users.upsertByPhoneNumber({
      phoneNumber: '+56933333333',
      firstName: 'Out',
      lastName: 'Sider',
      preferredName: 'Out',
      countryOfResidence: 'Chile',
      preferredCurrency: 'CLP',
      email: 'outsider@example.com',
      preferredLanguage: 'es'
    });

    const personal = await financialAccounts.ensurePersonalAccount(owner.id);
    const shared = await useCases.createSharedAccount({
      userId: owner.id,
      tenantId: owner.tenantId,
      sourceFinancialAccountId: personal.id,
      name: 'Viaje',
      currency: 'CLP'
    });

    const invitation = await useCases.inviteMember({
      actorUserId: owner.id,
      financialAccountId: shared.account.id,
      email: invited.email!
    });

    await expect(
      useCases.acceptInvitation({
        actorUserId: outsider.id,
        token: invitation.token
      })
    ).rejects.toThrow('Invitation does not belong to the authenticated user.');

    const accepted = await useCases.acceptInvitation({
      actorUserId: invited.id,
      token: invitation.token
    });

    expect(accepted.membership.account.id).toBe(shared.account.id);
    expect(accepted.membership.role).toBe('member');

    const members = await useCases.listMembers(owner.id, shared.account.id);
    expect(members.some((member) => member.userId === invited.id && member.role === 'member' && member.status === 'active')).toBe(true);
  });

  it('records that a shared-account invitation email was delivered', async () => {
    const users = new InMemoryUserRepository();
    const financialAccounts = new InMemoryFinancialAccountRepository(users);
    const email = new CapturingEmailProvider();
    const useCases = new FinancialAccountsUseCases(
      financialAccounts,
      new InMemoryCategoryRepository(),
      new InMemoryBudgetRepository(),
      new InMemoryBankOptionRepository(),
      new InMemoryPaymentMethodOptionRepository(),
      users,
      {
        email,
        frontendPublicOrigin: 'https://expenses-tracker-easg.netlify.app',
        now: () => new Date('2026-08-31T12:00:00.000Z')
      }
    );
    const owner = await users.upsertByPhoneNumber({
      phoneNumber: '+56911111114',
      firstName: 'Owner',
      lastName: 'User',
      preferredName: 'Owner',
      countryOfResidence: 'Chile',
      preferredCurrency: 'CLP',
      email: 'owner@example.com',
      preferredLanguage: 'es'
    });
    await users.upsertByPhoneNumber({
      phoneNumber: '+56911111116',
      firstName: 'Invitee',
      lastName: 'User',
      preferredName: 'Invitee',
      countryOfResidence: 'Chile',
      preferredCurrency: 'CLP',
      email: 'invitee@example.com',
      preferredLanguage: 'en'
    });
    const personal = await financialAccounts.ensurePersonalAccount(owner.id);
    const shared = await useCases.createSharedAccount({
      userId: owner.id,
      tenantId: owner.tenantId,
      sourceFinancialAccountId: personal.id,
      name: 'Casa',
      currency: 'CLP'
    });

    const invitation = await useCases.inviteMember({
      actorUserId: owner.id,
      financialAccountId: shared.account.id,
      email: 'invitee@example.com'
    });

    expect(invitation.emailSentAt).toBeDefined();
    expect(invitation.emailDeliveryError).toBeUndefined();
    expect(email.sent).toEqual([
      expect.objectContaining({
        to: 'invitee@example.com',
        subject: 'Owner invited you to the Casa account in Expenses Tracker',
        text: expect.stringContaining(`accountInvitationToken=${invitation.token}`)
      })
    ]);
  });

  it('keeps an invitation usable when its notification email cannot be delivered', async () => {
    const users = new InMemoryUserRepository();
    const financialAccounts = new InMemoryFinancialAccountRepository(users);
    const useCases = new FinancialAccountsUseCases(
      financialAccounts,
      new InMemoryCategoryRepository(),
      new InMemoryBudgetRepository(),
      new InMemoryBankOptionRepository(),
      new InMemoryPaymentMethodOptionRepository(),
      users,
      {
        email: new FailingEmailProvider(),
        frontendPublicOrigin: 'https://expenses-tracker-easg.netlify.app',
        now: () => new Date('2026-08-31T12:00:00.000Z')
      }
    );
    const owner = await users.upsertByPhoneNumber({
      phoneNumber: '+56911111115',
      firstName: 'Owner',
      lastName: 'User',
      preferredName: 'Owner',
      countryOfResidence: 'Chile',
      preferredCurrency: 'CLP',
      email: 'owner@example.com',
      preferredLanguage: 'es'
    });
    const personal = await financialAccounts.ensurePersonalAccount(owner.id);
    const shared = await useCases.createSharedAccount({
      userId: owner.id,
      tenantId: owner.tenantId,
      sourceFinancialAccountId: personal.id,
      name: 'Casa',
      currency: 'CLP'
    });

    const invitation = await useCases.inviteMember({
      actorUserId: owner.id,
      financialAccountId: shared.account.id,
      email: 'invitee@example.com'
    });

    expect(invitation.status).toBe('pending');
    expect(invitation.emailSentAt).toBeUndefined();
    expect(invitation.emailDeliveryError).toBe('Email provider unavailable.');
  });

  it('switches Telegram messaging context by shared account name and falls back to personal when missing', async () => {
    const users = new InMemoryUserRepository();
    const financialAccounts = new InMemoryFinancialAccountRepository(users);
    const useCases = new FinancialAccountsUseCases(
      financialAccounts,
      new InMemoryCategoryRepository(),
      new InMemoryBudgetRepository(),
      new InMemoryBankOptionRepository(),
      new InMemoryPaymentMethodOptionRepository(),
      users
    );

    const user = await users.upsertByPhoneNumber({
      phoneNumber: '+56911111111',
      firstName: 'Eduardo',
      lastName: 'Salas',
      preferredName: 'Eduardo',
      countryOfResidence: 'Chile',
      preferredCurrency: 'CLP',
      email: 'eduardo@example.com',
      preferredLanguage: 'es'
    });

    const personal = await financialAccounts.ensurePersonalAccount(user.id);
    const shared = await useCases.createSharedAccount({
      userId: user.id,
      tenantId: user.tenantId,
      sourceFinancialAccountId: personal.id,
      name: 'Casa común',
      currency: 'CLP'
    });

    const switched = await useCases.switchMessagingContext({
      userId: user.id,
      channel: 'telegram',
      providerUserId: 'chat-123',
      accountName: 'casa comun'
    });

    expect(switched.status).toBe('ok');
    if (switched.status === 'ok') {
      expect(switched.membership.account.id).toBe(shared.account.id);
    }

    const resolvedShared = await useCases.resolveMessagingContext({
      userId: user.id,
      channel: 'telegram',
      providerUserId: 'chat-123'
    });
    expect(resolvedShared.account.id).toBe(shared.account.id);

    const missing = await useCases.switchMessagingContext({
      userId: user.id,
      channel: 'telegram',
      providerUserId: 'chat-123',
      accountName: 'Inexistente'
    });
    expect(missing.status).toBe('not_found');

    const resolvedMissing = await useCases.resolveMessagingContext({
      userId: user.id,
      channel: 'telegram',
      providerUserId: 'unknown-chat'
    });
    expect(resolvedMissing.account.id).toBe(personal.id);
    expect(resolvedMissing.role).toBe('owner');
  });

  it('computes shared-account balances and applies settlements', async () => {
    const users = new InMemoryUserRepository();
    const expenses = new InMemoryExpenseRepository();
    const financialAccounts = new InMemoryFinancialAccountRepository(users, expenses);
    const categories = new InMemoryCategoryRepository();
    const budgets = new InMemoryBudgetRepository();
    const banks = new InMemoryBankOptionRepository();
    const paymentMethods = new InMemoryPaymentMethodOptionRepository();
    const useCases = new FinancialAccountsUseCases(financialAccounts, categories, budgets, banks, paymentMethods, users);
    const finance = new FinanceUseCases(
      expenses,
      new InMemoryIncomeRepository(),
      budgets,
      categories,
      banks,
      paymentMethods,
      financialAccounts
    );

    const owner = await users.upsertByPhoneNumber({
      phoneNumber: '+56911111111',
      firstName: 'Eduardo',
      lastName: 'Salas',
      preferredName: 'Eduardo',
      countryOfResidence: 'Chile',
      preferredCurrency: 'CLP',
      email: 'eduardo@example.com',
      preferredLanguage: 'es'
    });
    const member = await users.upsertByPhoneNumber({
      phoneNumber: '+56922222222',
      firstName: 'Vane',
      lastName: 'Pérez',
      preferredName: 'Vane',
      countryOfResidence: 'Chile',
      preferredCurrency: 'CLP',
      email: 'vane@example.com',
      preferredLanguage: 'es'
    });

    const personal = await financialAccounts.ensurePersonalAccount(owner.id);
    const shared = await useCases.createSharedAccount({
      userId: owner.id,
      tenantId: owner.tenantId,
      sourceFinancialAccountId: personal.id,
      name: 'Depto',
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

    await finance.createExpense({
      tenantId: owner.tenantId,
      financialAccountId: shared.account.id,
      userId: owner.id,
      createdByUserId: owner.id,
      paidByUserId: owner.id,
      date: '2026-08-11T00:00:00.000Z',
      amount: 20000,
      currency: 'CLP',
      concept: 'Cena',
      categoryId: category.id,
      allocationMode: 'equal',
      paymentMethod: { kind: 'card', bank: 'Banco de Crédito e Inversiones', cardType: 'credit' }
    });

    const balancesBefore = await useCases.listBalances(owner.id, shared.account.id);
    expect(balancesBefore).toEqual([
      expect.objectContaining({ userId: owner.id, netAmount: 10000, currency: 'CLP' }),
      expect.objectContaining({ userId: member.id, netAmount: -10000, currency: 'CLP' })
    ]);

    const settlement = await useCases.createSettlement({
      actorUserId: owner.id,
      financialAccountId: shared.account.id,
      paidByUserId: member.id,
      receivedByUserId: owner.id,
      currency: 'CLP',
      amount: 4000,
      settledAt: '2026-08-12T00:00:00.000Z',
      note: 'Transferencia parcial'
    });

    expect(settlement.amount).toBe(4000);
    expect(settlement.paidByUserId).toBe(member.id);

    const balancesAfter = await useCases.listBalances(owner.id, shared.account.id);
    expect(balancesAfter).toEqual([
      expect.objectContaining({ userId: owner.id, netAmount: 6000, currency: 'CLP' }),
      expect.objectContaining({ userId: member.id, netAmount: -6000, currency: 'CLP' })
    ]);

    const settlements = await useCases.listSettlements(owner.id, shared.account.id);
    expect(settlements).toHaveLength(1);
    expect(settlements[0]).toEqual(expect.objectContaining({
      paidByUserId: member.id,
      receivedByUserId: owner.id,
      amount: 4000,
      note: 'Transferencia parcial'
    }));

    const suggestions = await useCases.listSettlementSuggestions(owner.id, shared.account.id);
    expect(suggestions).toEqual([
      expect.objectContaining({
        fromUserId: member.id,
        fromPreferredName: 'Vane',
        toUserId: owner.id,
        toPreferredName: 'Eduardo',
        amount: 6000,
        currency: 'CLP'
      })
    ]);
  });
});

class CapturingEmailProvider implements EmailProvider {
  readonly sent: Array<{ to: string; subject: string; html: string; text?: string }> = [];

  async send(options: { to: string; subject: string; html: string; text?: string }) {
    this.sent.push(options);
  }
}

class FailingEmailProvider implements EmailProvider {
  async send() {
    throw new Error('Email provider unavailable.');
  }
}
