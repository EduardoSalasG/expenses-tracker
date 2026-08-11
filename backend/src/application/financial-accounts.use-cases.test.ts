import { describe, expect, it } from 'vitest';
import { FinancialAccountsUseCases } from './use-cases/financial-accounts.use-cases.js';
import {
  InMemoryBankOptionRepository,
  InMemoryBudgetRepository,
  InMemoryCategoryRepository,
  InMemoryFinancialAccountRepository,
  InMemoryPaymentMethodOptionRepository,
  InMemoryUserRepository
} from '../infrastructure/repositories/in-memory.js';

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

    const food = await categories.create({
      tenantId: user.tenantId,
      financialAccountId: personal.id,
      name: 'Food',
      isDefault: false
    });
    const restaurants = await categories.create({
      tenantId: user.tenantId,
      financialAccountId: personal.id,
      name: 'Restaurants',
      parentId: food.id,
      isDefault: false
    });

    await budgets.upsertMonthly({
      tenantId: user.tenantId,
      financialAccountId: personal.id,
      categoryId: food.id,
      subcategoryId: restaurants.id,
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
    const sharedFood = sharedCategories.find((category) => category.name === 'Food' && !category.parentId);
    const sharedRestaurants = sharedCategories.find((category) => category.name === 'Restaurants' && category.parentId === sharedFood?.id);

    expect(sharedFood).toBeDefined();
    expect(sharedRestaurants).toBeDefined();

    const sharedBudgets = await budgets.listMonthly(user.tenantId, created.account.id);
    expect(sharedBudgets).toHaveLength(1);
    expect(sharedBudgets[0].categoryId).toBe(sharedFood?.id);
    expect(sharedBudgets[0].subcategoryId).toBe(sharedRestaurants?.id);

    const sharedBanks = await banks.listByTenant(user.tenantId, created.account.id);
    expect(sharedBanks.some((bank) => bank.name === 'Banco de prueba' && bank.financialAccountId === created.account.id)).toBe(true);

    const sharedPaymentMethods = await paymentMethods.listByTenant(user.tenantId, created.account.id);
    expect(sharedPaymentMethods.some((method) => method.name === 'Tarjeta favorita' && method.financialAccountId === created.account.id)).toBe(true);
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
      email: invited.email!,
      phoneNumber: invited.phoneNumber,
      role: 'member'
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
});
