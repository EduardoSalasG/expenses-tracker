import { describe, expect, it } from 'vitest';
import { ProcessInboundFinanceMessageUseCase } from './use-cases.js';
import {
  InMemoryBankOptionRepository,
  InMemoryCategoryRepository,
  InMemoryBudgetRepository,
  InMemoryExpenseRepository,
  InMemoryIncomeRepository,
  InMemoryUserRepository,
  InMemoryMessagingMessageAuditRepository,
  InMemoryMessagingPendingDraftRepository,
  InMemoryPaymentMethodOptionRepository
} from '../infrastructure/repositories/in-memory.js';
import { DeterministicMessageInterpreter } from './message-interpreter.js';
import type { MessageInterpreterPort, MessagingProvider } from './ports.js';

describe('ProcessInboundFinanceMessageUseCase', () => {
  it('audits and ignores unregistered senders', async () => {
    const audits = new InMemoryMessagingMessageAuditRepository();
    const useCase = new ProcessInboundFinanceMessageUseCase(
      new InMemoryUserRepository(),
      new InMemoryCategoryRepository(),
      new InMemoryExpenseRepository(),
      new InMemoryIncomeRepository(),
      new InMemoryBudgetRepository(),
      new InMemoryBankOptionRepository(),
      new InMemoryPaymentMethodOptionRepository(),
      audits,
      new InMemoryMessagingPendingDraftRepository(),
      new NoopMessagingProvider(),
      new DeterministicMessageInterpreter(),
      { now: () => new Date('2026-05-06T00:00:00.000Z') },
      { frontendPublicOrigin: 'https://expenses-tracker-easg.netlify.app' }
    );

    const result = await useCase.execute({
      providerMessageId: 'wamid.test-unknown',
      fromPhoneNumber: '+16315551181',
      message: 'this is a text message'
    });

    expect(result.status).toBe('ignored_unregistered_sender');
    expect(audits.messages).toHaveLength(1);
    expect(audits.messages[0]).toMatchObject({
      providerMessageId: 'wamid.test-unknown',
      fromPhoneNumber: '+16315551181',
      message: 'this is a text message',
      parsingStatus: 'unknown_user'
    });
  });

  it('ignores duplicate WhatsApp provider message ids before creating a second expense', async () => {
    const users = new InMemoryUserRepository();
    const categories = new InMemoryCategoryRepository();
    const expenses = new InMemoryExpenseRepository();
    const audits = new InMemoryMessagingMessageAuditRepository();
    const user = await users.upsertByPhoneNumber({
      phoneNumber: '+56982439041',
      firstName: 'Test',
      lastName: 'User',
      preferredName: 'Test',
      countryOfResidence: 'Chile',
      preferredCurrency: 'CLP'
    });
    await categories.ensureDefaults(user.tenantId);
    const useCase = new ProcessInboundFinanceMessageUseCase(
      users,
      categories,
      expenses,
      new InMemoryIncomeRepository(),
      new InMemoryBudgetRepository(),
      new InMemoryBankOptionRepository(),
      new InMemoryPaymentMethodOptionRepository(),
      audits,
      new InMemoryMessagingPendingDraftRepository(),
      new NoopMessagingProvider(),
      new DeterministicMessageInterpreter(),
      { now: () => new Date('2026-05-06T00:00:00.000Z') },
      { frontendPublicOrigin: 'https://expenses-tracker-easg.netlify.app' }
    );

    const input = {
      providerMessageId: 'wamid.duplicate',
      fromPhoneNumber: '+56982439041',
      message: 'CLP 12500 groceries cash'
    };

    const first = await useCase.execute(input);
    const second = await useCase.execute(input);

    expect(first.status).toBe('saved');
    expect(second.status).toBe('duplicate_ignored');
    expect(await expenses.listRecent(user.tenantId, 10)).toHaveLength(1);
    expect(audits.messages).toHaveLength(1);
    expect(audits.messages[0].parsingStatus).toBe('saved');
  });

  it('asks before saving recent duplicate text messages with different provider ids', async () => {
    const users = new InMemoryUserRepository();
    const categories = new InMemoryCategoryRepository();
    const expenses = new InMemoryExpenseRepository();
    const audits = new InMemoryMessagingMessageAuditRepository();
    const messaging = new CapturingMessagingProvider();
    const user = await users.upsertByPhoneNumber({
      phoneNumber: '+56982439041',
      firstName: 'Test',
      lastName: 'User',
      preferredName: 'Test',
      countryOfResidence: 'Chile',
      preferredCurrency: 'CLP'
    });
    await categories.ensureDefaults(user.tenantId);
    const useCase = new ProcessInboundFinanceMessageUseCase(
      users,
      categories,
      expenses,
      new InMemoryIncomeRepository(),
      new InMemoryBudgetRepository(),
      new InMemoryBankOptionRepository(),
      new InMemoryPaymentMethodOptionRepository(),
      audits,
      new InMemoryMessagingPendingDraftRepository(),
      messaging,
      new DeterministicMessageInterpreter(),
      { now: () => new Date('2026-05-06T00:00:00.000Z') },
      { frontendPublicOrigin: 'https://expenses-tracker-easg.netlify.app' }
    );

    const first = await useCase.execute({
      providerMessageId: 'wamid.recent-1',
      fromPhoneNumber: '+56982439041',
      message: 'CLP 12500 groceries cash'
    });
    const second = await useCase.execute({
      providerMessageId: 'wamid.recent-2',
      fromPhoneNumber: '+56982439041',
      message: 'CLP 12500 groceries cash'
    });
    const confirmed = await useCase.execute({
      providerMessageId: 'wamid.recent-confirm',
      fromPhoneNumber: '+56982439041',
      message: 'guardar'
    });

    expect(first.status).toBe('saved');
    expect(second.status).toBe('duplicate_needs_confirmation');
    expect(confirmed.status).toBe('saved');
    expect(await expenses.listRecent(user.tenantId, 10)).toHaveLength(2);
    expect(messaging.messages.at(-2)?.body).toContain('posible movimiento duplicado reciente');
    expect(messaging.messages.at(-1)?.body).toContain('Gasto guardado.');
  });

  it('saves income messages without creating expenses', async () => {
    const users = new InMemoryUserRepository();
    const categories = new InMemoryCategoryRepository();
    const expenses = new InMemoryExpenseRepository();
    const incomes = new InMemoryIncomeRepository();
    const audits = new InMemoryMessagingMessageAuditRepository();
    const user = await users.upsertByPhoneNumber({
      phoneNumber: '+56982439041',
      firstName: 'Test',
      lastName: 'User',
      preferredName: 'Test',
      countryOfResidence: 'Chile',
      preferredCurrency: 'CLP'
    });
    await categories.ensureDefaults(user.tenantId);
    const useCase = new ProcessInboundFinanceMessageUseCase(
      users,
      categories,
      expenses,
      incomes,
      new InMemoryBudgetRepository(),
      new InMemoryBankOptionRepository(),
      new InMemoryPaymentMethodOptionRepository(),
      audits,
      new InMemoryMessagingPendingDraftRepository(),
      new NoopMessagingProvider(),
      new DeterministicMessageInterpreter(),
      { now: () => new Date('2026-05-06T00:00:00.000Z') },
      { frontendPublicOrigin: 'https://expenses-tracker-easg.netlify.app' }
    );

    const result = await useCase.execute({
      providerMessageId: 'wamid.income',
      fromPhoneNumber: '+56982439041',
      message: 'CLP 900000 sueldo'
    });

    expect(result.status).toBe('income_saved');
    expect(await expenses.listRecent(user.tenantId, 10)).toHaveLength(0);
    expect(await incomes.listByPeriod(user.tenantId, '2026-05-01T00:00:00.000Z', '2026-05-31T23:59:59.999Z')).toHaveLength(1);
  });

  it('assigns categories and subcategories from natural WhatsApp expense text', async () => {
    const users = new InMemoryUserRepository();
    const categories = new InMemoryCategoryRepository();
    const expenses = new InMemoryExpenseRepository();
    const user = await users.upsertByPhoneNumber({
      phoneNumber: '+56982439041',
      firstName: 'Test',
      lastName: 'User',
      preferredName: 'Test',
      countryOfResidence: 'Chile',
      preferredCurrency: 'CLP'
    });
    await categories.ensureDefaults(user.tenantId);
    const messaging = new CapturingMessagingProvider();
    const useCase = new ProcessInboundFinanceMessageUseCase(
      users,
      categories,
      expenses,
      new InMemoryIncomeRepository(),
      new InMemoryBudgetRepository(),
      new InMemoryBankOptionRepository(),
      new InMemoryPaymentMethodOptionRepository(),
      new InMemoryMessagingMessageAuditRepository(),
      new InMemoryMessagingPendingDraftRepository(),
      messaging,
      new DeterministicMessageInterpreter(),
      { now: () => new Date('2026-05-06T00:00:00.000Z') },
      { frontendPublicOrigin: 'https://expenses-tracker-easg.netlify.app' }
    );

    const result = await useCase.execute({
      providerMessageId: 'wamid.groceries-category',
      fromPhoneNumber: '+56982439041',
      message: '20.000 groceries cash'
    });

    expect(result.status).toBe('saved');
    const [expense] = await expenses.listRecent(user.tenantId, 10);
    const tenantCategories = await categories.listByTenant(user.tenantId);
    const food = tenantCategories.find((category) => category.name === 'Food' && !category.parentId);
    const groceries = tenantCategories.find((category) => category.name === 'Groceries' && category.parentId === food?.id);
    expect(expense.categoryId).toBe(food?.id);
    expect(expense.subcategoryId).toBe(groceries?.id);
    expect(messaging.messages).toEqual([{
      toPhoneNumber: '+56982439041',
      body: [
        'Test, Gasto guardado.',
        'Monto: $20.000.',
        'Concepto: groceries.',
        'Categoría: Food > Groceries.'
      ].join('\n')
    }]);
  });

  it('asks for category instead of defaulting when it cannot identify one confidently', async () => {
    const users = new InMemoryUserRepository();
    const categories = new InMemoryCategoryRepository();
    const expenses = new InMemoryExpenseRepository();
    const drafts = new InMemoryMessagingPendingDraftRepository();
    const user = await users.upsertByPhoneNumber({
      phoneNumber: '+56982439041',
      firstName: 'Test',
      lastName: 'User',
      preferredName: 'Test',
      countryOfResidence: 'Chile',
      preferredCurrency: 'CLP'
    });
    await categories.ensureDefaults(user.tenantId);
    const messaging = new CapturingMessagingProvider();
    const useCase = new ProcessInboundFinanceMessageUseCase(
      users,
      categories,
      expenses,
      new InMemoryIncomeRepository(),
      new InMemoryBudgetRepository(),
      new InMemoryBankOptionRepository(),
      new InMemoryPaymentMethodOptionRepository(),
      new InMemoryMessagingMessageAuditRepository(),
      drafts,
      messaging,
      new DeterministicMessageInterpreter(),
      { now: () => new Date('2026-05-06T00:00:00.000Z') },
      { frontendPublicOrigin: 'https://expenses-tracker-easg.netlify.app' }
    );

    const result = await useCase.execute({
      providerMessageId: 'wamid.dance-category',
      fromPhoneNumber: '+56982439041',
      message: '20.000 clases de bachata bsoul mayo, transferencia desde bci'
    });

    expect(result.status).toBe('needs_confirmation');
    expect(await expenses.listRecent(user.tenantId, 10)).toHaveLength(0);
    expect(messaging.messages[0].body.toLowerCase()).toContain('no pude identificar con suficiente certeza la categoría');
    const pending = await drafts.findActive(user.tenantId, user.id, new Date('2026-05-06T00:00:00.000Z'));
    expect(pending?.missingFields).toContain('category');
  });

  it('asks the user to disambiguate duplicate subcategories before saving', async () => {
    const users = new InMemoryUserRepository();
    const categories = new InMemoryCategoryRepository();
    const expenses = new InMemoryExpenseRepository();
    const drafts = new InMemoryMessagingPendingDraftRepository();
    const messaging = new CapturingMessagingProvider();
    const user = await users.upsertByPhoneNumber({
      phoneNumber: '+56982439041',
      firstName: 'Test',
      lastName: 'User',
      preferredName: 'Test',
      countryOfResidence: 'Chile',
      preferredCurrency: 'CLP'
    });
    await categories.ensureDefaults(user.tenantId);
    const tenantCategories = await categories.listByTenant(user.tenantId);
    const education = tenantCategories.find((category) => category.name === 'Education' && !category.parentId);
    const entertainment = tenantCategories.find((category) => category.name === 'Entertainment' && !category.parentId);
    if (!education || !entertainment) throw new Error('Missing root categories for duplicate subcategory test.');
    await categories.create({ tenantId: user.tenantId, name: 'Dance', parentId: education.id, isDefault: false });
    await categories.create({ tenantId: user.tenantId, name: 'Dance', parentId: entertainment.id, isDefault: false });

    const useCase = new ProcessInboundFinanceMessageUseCase(
      users,
      categories,
      expenses,
      new InMemoryIncomeRepository(),
      new InMemoryBudgetRepository(),
      new InMemoryBankOptionRepository(),
      new InMemoryPaymentMethodOptionRepository(),
      new InMemoryMessagingMessageAuditRepository(),
      drafts,
      messaging,
      new DeterministicMessageInterpreter(),
      { now: () => new Date('2026-05-06T00:00:00.000Z') },
      { frontendPublicOrigin: 'https://expenses-tracker-easg.netlify.app' }
    );

    const first = await useCase.execute({
      providerMessageId: 'wamid.ambiguous-1',
      fromPhoneNumber: '+56982439041',
      message: '20.000 clases bsoul, transferencia desde bci'
    });
    const second = await useCase.execute({
      providerMessageId: 'wamid.ambiguous-2',
      fromPhoneNumber: '+56982439041',
      message: 'Dance'
    });
    const third = await useCase.execute({
      providerMessageId: 'wamid.ambiguous-3',
      fromPhoneNumber: '+56982439041',
      message: '1'
    });

    expect(first.status).toBe('needs_confirmation');
    expect(second.status).toBe('needs_confirmation');
    expect(messaging.messages.at(-2)?.body).toContain('Encontré más de una categoría coincidente');
    expect(third.status).toBe('saved');
    const [expense] = await expenses.listRecent(user.tenantId, 10);
    expect(expense.subcategoryId).toBeDefined();
  });

  it('offers to create a category when it does not exist and saves after creation', async () => {
    const users = new InMemoryUserRepository();
    const categories = new InMemoryCategoryRepository();
    const expenses = new InMemoryExpenseRepository();
    const drafts = new InMemoryMessagingPendingDraftRepository();
    const messaging = new CapturingMessagingProvider();
    const user = await users.upsertByPhoneNumber({
      phoneNumber: '+56982439041',
      firstName: 'Test',
      lastName: 'User',
      preferredName: 'Test',
      countryOfResidence: 'Chile',
      preferredCurrency: 'CLP'
    });
    await categories.ensureDefaults(user.tenantId);

    const useCase = new ProcessInboundFinanceMessageUseCase(
      users,
      categories,
      expenses,
      new InMemoryIncomeRepository(),
      new InMemoryBudgetRepository(),
      new InMemoryBankOptionRepository(),
      new InMemoryPaymentMethodOptionRepository(),
      new InMemoryMessagingMessageAuditRepository(),
      drafts,
      messaging,
      new DeterministicMessageInterpreter(),
      { now: () => new Date('2026-05-06T00:00:00.000Z') },
      { frontendPublicOrigin: 'https://expenses-tracker-easg.netlify.app' }
    );

    const first = await useCase.execute({
      providerMessageId: 'wamid.create-category-1',
      fromPhoneNumber: '+56982439041',
      message: '20.000 pilates, transferencia desde bci'
    });
    const second = await useCase.execute({
      providerMessageId: 'wamid.create-category-2',
      fromPhoneNumber: '+56982439041',
      message: 'Pilates'
    });
    const third = await useCase.execute({
      providerMessageId: 'wamid.create-category-3',
      fromPhoneNumber: '+56982439041',
      message: 'sí'
    });
    const fourth = await useCase.execute({
      providerMessageId: 'wamid.create-category-4',
      fromPhoneNumber: '+56982439041',
      message: 'subcategoría de Health'
    });

    expect(first.status).toBe('needs_confirmation');
    expect(second.status).toBe('needs_confirmation');
    expect(messaging.messages.at(-3)?.body).toContain('No encontré "Pilates"');
    expect(third.status).toBe('needs_confirmation');
    expect(messaging.messages.at(-2)?.body).toContain('¿Cómo quieres crear "Pilates"');
    expect(fourth.status).toBe('saved');
    const tenantCategories = await categories.listByTenant(user.tenantId);
    const health = tenantCategories.find((category) => category.name === 'Health' && !category.parentId);
    const pilates = tenantCategories.find((category) => category.name === 'Pilates' && category.parentId === health?.id);
    expect(pilates).toBeDefined();
    const [expense] = await expenses.listRecent(user.tenantId, 10);
    expect(expense.categoryId).toBe(health?.id);
    expect(expense.subcategoryId).toBe(pilates?.id);
  });

  it('stores installment expenses and confirms the generated quota plan', async () => {
    const users = new InMemoryUserRepository();
    const categories = new InMemoryCategoryRepository();
    const expenses = new InMemoryExpenseRepository();
    const messaging = new CapturingMessagingProvider();
    const user = await users.upsertByPhoneNumber({
      phoneNumber: '+56982439041',
      firstName: 'Test',
      lastName: 'User',
      preferredName: 'Vane',
      countryOfResidence: 'Chile',
      preferredCurrency: 'CLP'
    });
    await users.linkTelegramChatByPhone(user.phoneNumber, '999');
    await categories.ensureDefaults(user.tenantId);
    const useCase = new ProcessInboundFinanceMessageUseCase(
      users,
      categories,
      expenses,
      new InMemoryIncomeRepository(),
      new InMemoryBudgetRepository(),
      new InMemoryBankOptionRepository(),
      new InMemoryPaymentMethodOptionRepository(),
      new InMemoryMessagingMessageAuditRepository(),
      new InMemoryMessagingPendingDraftRepository(),
      messaging,
      new DeterministicMessageInterpreter(),
      { now: () => new Date('2026-05-06T00:00:00.000Z') },
      { frontendPublicOrigin: 'https://expenses-tracker-easg.netlify.app' }
    );

    const result = await useCase.execute({
      providerMessageId: 'tg-installments',
      channel: 'telegram',
      fromPhoneNumber: 'tg:999',
      providerUserId: '999',
      replyTo: '999',
      message: '500000 supermercado, tdc bci, 3 cuotas'
    });

    expect(result.status).toBe('saved');
    const rows = await expenses.listRecent(user.tenantId, 10);
    expect(rows).toHaveLength(3);
    expect(rows.every((row) => row.installmentCount === 3)).toBe(true);
    expect(rows.map((row) => row.installmentNumber)).toEqual([3, 2, 1]);
    expect(messaging.messages.at(-1)?.body).toContain('Vane, Gasto guardado.');
    expect(messaging.messages.at(-1)?.body).toContain('Cuotas: 3 de $166.667.');
  });

  it('uses the user preferred currency for WhatsApp income even if the interpreter returns another currency', async () => {
    const users = new InMemoryUserRepository();
    const categories = new InMemoryCategoryRepository();
    const incomes = new InMemoryIncomeRepository();
    const user = await users.upsertByPhoneNumber({
      phoneNumber: '+56982439041',
      firstName: 'Test',
      lastName: 'User',
      preferredName: 'Test',
      countryOfResidence: 'Chile',
      preferredCurrency: 'CLP'
    });
    await categories.ensureDefaults(user.tenantId);
    const useCase = new ProcessInboundFinanceMessageUseCase(
      users,
      categories,
      new InMemoryExpenseRepository(),
      incomes,
      new InMemoryBudgetRepository(),
      new InMemoryBankOptionRepository(),
      new InMemoryPaymentMethodOptionRepository(),
      new InMemoryMessagingMessageAuditRepository(),
      new InMemoryMessagingPendingDraftRepository(),
      new NoopMessagingProvider(),
      new FixedIncomeInterpreter(),
      { now: () => new Date('2026-05-06T00:00:00.000Z') },
      { frontendPublicOrigin: 'https://expenses-tracker-easg.netlify.app' }
    );

    await useCase.execute({
      providerMessageId: 'wamid.income-currency',
      fromPhoneNumber: '+56982439041',
      message: 'Ingreso de sueldo 1200000 Bci transferencia'
    });

    const [income] = await incomes.listByPeriod(user.tenantId, '2026-05-01T00:00:00.000Z', '2026-05-31T23:59:59.999Z');
    expect(income.currency).toBe('CLP');
  });

  it('stores an incomplete WhatsApp expense draft and completes it with the next reply', async () => {
    const users = new InMemoryUserRepository();
    const categories = new InMemoryCategoryRepository();
    const expenses = new InMemoryExpenseRepository();
    const drafts = new InMemoryMessagingPendingDraftRepository();
    const user = await users.upsertByPhoneNumber({
      phoneNumber: '+56982439041',
      firstName: 'Test',
      lastName: 'User',
      preferredName: 'Test',
      countryOfResidence: 'Chile',
      preferredCurrency: 'CLP'
    });
    await categories.ensureDefaults(user.tenantId);
    const useCase = new ProcessInboundFinanceMessageUseCase(
      users,
      categories,
      expenses,
      new InMemoryIncomeRepository(),
      new InMemoryBudgetRepository(),
      new InMemoryBankOptionRepository(),
      new InMemoryPaymentMethodOptionRepository(),
      new InMemoryMessagingMessageAuditRepository(),
      drafts,
      new NoopMessagingProvider(),
      new DeterministicMessageInterpreter(),
      { now: () => new Date('2026-05-06T00:00:00.000Z') },
      { frontendPublicOrigin: 'https://expenses-tracker-easg.netlify.app' }
    );

    const first = await useCase.execute({
      providerMessageId: 'wamid.pending-1',
      fromPhoneNumber: '+56982439041',
      message: '20.000 clases de bachata bsoul mayo'
    });
    const second = await useCase.execute({
      providerMessageId: 'wamid.pending-2',
      fromPhoneNumber: '+56982439041',
      message: 'transferencia desde bci'
    });
    const third = await useCase.execute({
      providerMessageId: 'wamid.pending-3',
      fromPhoneNumber: '+56982439041',
      message: 'Education'
    });

    expect(first.status).toBe('needs_confirmation');
    expect(second.status).toBe('needs_confirmation');
    expect(third.status).toBe('saved');
    const [expense] = await expenses.listRecent(user.tenantId, 10);
    expect(expense.amount).toBe(20000);
    expect(expense.concept).toBe('clases de bachata bsoul mayo');
    expect(expense.paymentMethod).toEqual({ kind: 'transfer', bank: 'Banco de Crédito e Inversiones', cardType: undefined });
    expect(await drafts.findActive(user.tenantId, user.id, new Date('2026-05-06T00:00:00.000Z'))).toBeUndefined();
  });

  it('updates a referenced recent expense from a chat correction', async () => {
    const users = new InMemoryUserRepository();
    const categories = new InMemoryCategoryRepository();
    const expenses = new InMemoryExpenseRepository();
    const messaging = new CapturingMessagingProvider();
    const user = await users.upsertByPhoneNumber({
      phoneNumber: '+56982439041',
      firstName: 'Test',
      lastName: 'User',
      preferredName: 'Eduardo',
      countryOfResidence: 'Chile',
      preferredCurrency: 'CLP'
    });
    await categories.ensureDefaults(user.tenantId);
    const tenantCategories = await categories.listByTenant(user.tenantId);
    const education = tenantCategories.find((category) => category.name === 'Education' && !category.parentId);
    if (!education) throw new Error('Missing Education category in test defaults.');
    await expenses.create({
      tenantId: user.tenantId,
      userId: user.id,
      date: '2026-05-06T00:00:00.000Z',
      amount: 14000,
      currency: 'CLP',
      concept: 'Hamburguesas',
      categoryId: education.id,
      paymentMethod: { kind: 'cash' }
    });
    const useCase = new ProcessInboundFinanceMessageUseCase(
      users,
      categories,
      expenses,
      new InMemoryIncomeRepository(),
      new InMemoryBudgetRepository(),
      new InMemoryBankOptionRepository(),
      new InMemoryPaymentMethodOptionRepository(),
      new InMemoryMessagingMessageAuditRepository(),
      new InMemoryMessagingPendingDraftRepository(),
      messaging,
      new DeterministicMessageInterpreter(),
      { now: () => new Date('2026-05-06T00:05:00.000Z') },
      { frontendPublicOrigin: 'https://expenses-tracker-easg.netlify.app' }
    );

    const result = await useCase.execute({
      providerMessageId: 'wamid.update-expense-category',
      fromPhoneNumber: '+56982439041',
      message: [
        'Cambia la categoría de este gasto a restaurantes',
        'Monto: $14.000.',
        'Concepto: Hamburguesas.',
        'Categoría: Education.'
      ].join('\n')
    });

    expect(result.status).toBe('expense_updated');
    const [updated] = await expenses.listRecent(user.tenantId, 10);
    const food = tenantCategories.find((category) => category.name === 'Food' && !category.parentId);
    const restaurants = tenantCategories.find((category) => category.name === 'Restaurants' && category.parentId === food?.id);
    expect(updated.categoryId).toBe(food?.id);
    expect(updated.subcategoryId).toBe(restaurants?.id);
    expect(messaging.messages.at(-1)?.body).toContain('Eduardo, Gasto actualizado.');
    expect(messaging.messages.at(-1)?.body).toContain('Categoría: Food > Restaurants.');
  });

  it('updates expense amount and concept from a Telegram correction', async () => {
    const users = new InMemoryUserRepository();
    const categories = new InMemoryCategoryRepository();
    const expenses = new InMemoryExpenseRepository();
    const messaging = new CapturingMessagingProvider();
    const user = await users.upsertByPhoneNumber({
      phoneNumber: '+56982439041',
      firstName: 'Test',
      lastName: 'User',
      preferredName: 'Vane',
      countryOfResidence: 'Chile',
      preferredCurrency: 'CLP'
    });
    await users.linkTelegramChatByPhone(user.phoneNumber, '999');
    await categories.ensureDefaults(user.tenantId);
    const tenantCategories = await categories.listByTenant(user.tenantId);
    const food = tenantCategories.find((category) => category.name === 'Food' && !category.parentId);
    if (!food) throw new Error('Missing Food category in test defaults.');
    await expenses.create({
      tenantId: user.tenantId,
      userId: user.id,
      date: '2026-05-06T00:00:00.000Z',
      amount: 25000,
      currency: 'CLP',
      concept: 'sushi burger',
      categoryId: food.id,
      paymentMethod: { kind: 'cash' }
    });
    const useCase = new ProcessInboundFinanceMessageUseCase(
      users,
      categories,
      expenses,
      new InMemoryIncomeRepository(),
      new InMemoryBudgetRepository(),
      new InMemoryBankOptionRepository(),
      new InMemoryPaymentMethodOptionRepository(),
      new InMemoryMessagingMessageAuditRepository(),
      new InMemoryMessagingPendingDraftRepository(),
      messaging,
      new DeterministicMessageInterpreter(),
      { now: () => new Date('2026-05-06T00:05:00.000Z') },
      { frontendPublicOrigin: 'https://expenses-tracker-easg.netlify.app' }
    );

    const result = await useCase.execute({
      providerMessageId: 'tg-update-expense-amount-concept',
      channel: 'telegram',
      fromPhoneNumber: 'tg:999',
      providerUserId: '999',
      replyTo: '999',
      message: [
        'Cambia este gasto a 30.000 y concepto cena sushi burger',
        'Monto: $25.000.',
        'Concepto: sushi burger.',
        'Categoría: Food.'
      ].join('\n')
    });

    expect(result.status).toBe('expense_updated');
    const [updated] = await expenses.listRecent(user.tenantId, 10);
    expect(updated.amount).toBe(30000);
    expect(updated.concept).toContain('cena sushi burger');
    expect(messaging.messages.at(-1)?.body).toContain('Vane, Gasto actualizado.');
    expect(messaging.messages.at(-1)?.body).toContain('Monto: $30.000.');
    expect(messaging.messages.at(-1)?.body).toContain('Concepto: cena sushi burger.');
  });

  it('updates expense category and subcategory from a Telegram correction', async () => {
    const users = new InMemoryUserRepository();
    const categories = new InMemoryCategoryRepository();
    const expenses = new InMemoryExpenseRepository();
    const messaging = new CapturingMessagingProvider();
    const user = await users.upsertByPhoneNumber({
      phoneNumber: '+56982439041',
      firstName: 'Test',
      lastName: 'User',
      preferredName: 'Vane',
      countryOfResidence: 'Chile',
      preferredCurrency: 'CLP'
    });
    await users.linkTelegramChatByPhone(user.phoneNumber, '999');
    await categories.ensureDefaults(user.tenantId);
    const tenantCategories = await categories.listByTenant(user.tenantId);
    const education = tenantCategories.find((category) => category.name === 'Education' && !category.parentId);
    if (!education) throw new Error('Missing Education category in test defaults.');
    await expenses.create({
      tenantId: user.tenantId,
      userId: user.id,
      date: '2026-05-06T00:00:00.000Z',
      amount: 14000,
      currency: 'CLP',
      concept: 'Hamburguesas',
      categoryId: education.id,
      paymentMethod: { kind: 'cash' }
    });
    const useCase = new ProcessInboundFinanceMessageUseCase(
      users,
      categories,
      expenses,
      new InMemoryIncomeRepository(),
      new InMemoryBudgetRepository(),
      new InMemoryBankOptionRepository(),
      new InMemoryPaymentMethodOptionRepository(),
      new InMemoryMessagingMessageAuditRepository(),
      new InMemoryMessagingPendingDraftRepository(),
      messaging,
      new DeterministicMessageInterpreter(),
      { now: () => new Date('2026-05-06T00:05:00.000Z') },
      { frontendPublicOrigin: 'https://expenses-tracker-easg.netlify.app' }
    );

    const result = await useCase.execute({
      providerMessageId: 'tg-update-expense-category',
      channel: 'telegram',
      fromPhoneNumber: 'tg:999',
      providerUserId: '999',
      replyTo: '999',
      message: [
        'Cambia la categoría de este gasto a restaurantes',
        'Monto: $14.000.',
        'Concepto: Hamburguesas.',
        'Categoría: Education.'
      ].join('\n')
    });

    expect(result.status).toBe('expense_updated');
    const [updated] = await expenses.listRecent(user.tenantId, 10);
    const food = tenantCategories.find((category) => category.name === 'Food' && !category.parentId);
    const restaurants = tenantCategories.find((category) => category.name === 'Restaurants' && category.parentId === food?.id);
    expect(updated.categoryId).toBe(food?.id);
    expect(updated.subcategoryId).toBe(restaurants?.id);
    expect(messaging.messages.at(-1)?.body).toContain('Vane, Gasto actualizado.');
    expect(messaging.messages.at(-1)?.body).toContain('Categoría: Food > Restaurants.');
  });

  it('updates a referenced recent income from a Telegram correction', async () => {
    const users = new InMemoryUserRepository();
    const categories = new InMemoryCategoryRepository();
    const incomes = new InMemoryIncomeRepository();
    const messaging = new CapturingMessagingProvider();
    const user = await users.upsertByPhoneNumber({
      phoneNumber: '+56982439041',
      firstName: 'Test',
      lastName: 'User',
      preferredName: 'Vane',
      countryOfResidence: 'Chile',
      preferredCurrency: 'CLP'
    });
    await users.linkTelegramChatByPhone(user.phoneNumber, '999');
    await categories.ensureDefaults(user.tenantId);
    await incomes.create({
      tenantId: user.tenantId,
      userId: user.id,
      date: '2026-05-03T00:00:00.000Z',
      amount: 1200000,
      currency: 'CLP',
      concept: 'Sueldo'
    });
    const useCase = new ProcessInboundFinanceMessageUseCase(
      users,
      categories,
      new InMemoryExpenseRepository(),
      incomes,
      new InMemoryBudgetRepository(),
      new InMemoryBankOptionRepository(),
      new InMemoryPaymentMethodOptionRepository(),
      new InMemoryMessagingMessageAuditRepository(),
      new InMemoryMessagingPendingDraftRepository(),
      messaging,
      new DeterministicMessageInterpreter(),
      { now: () => new Date('2026-05-06T00:05:00.000Z') },
      { frontendPublicOrigin: 'https://expenses-tracker-easg.netlify.app' }
    );

    const result = await useCase.execute({
      providerMessageId: 'tg-update-income',
      channel: 'telegram',
      fromPhoneNumber: 'tg:999',
      providerUserId: '999',
      replyTo: '999',
      message: [
        'Cambia este ingreso a 1.250.000 y concepto sueldo mayo',
        'Monto: $1.200.000.',
        'Concepto: Sueldo.'
      ].join('\n')
    });

    expect(result.status).toBe('income_updated');
    const [updated] = await incomes.listRecent(user.tenantId, 10);
    expect(updated.amount).toBe(1250000);
    expect(updated.concept).toContain('sueldo mayo');
    expect(messaging.messages.at(-1)?.body).toContain('Vane, Ingreso actualizado.');
    expect(messaging.messages.at(-1)?.body).toContain('Monto: $1.250.000.');
    expect(messaging.messages.at(-1)?.body).toContain('Concepto: sueldo mayo.');
  });

  it('answers budget remaining when the user asks how much money is left', async () => {
    const users = new InMemoryUserRepository();
    const categories = new InMemoryCategoryRepository();
    const expenses = new InMemoryExpenseRepository();
    const budgets = new InMemoryBudgetRepository();
    const messaging = new CapturingMessagingProvider();
    const user = await users.upsertByPhoneNumber({
      phoneNumber: '+56982439041',
      firstName: 'Test',
      lastName: 'User',
      preferredName: 'Vane',
      countryOfResidence: 'Chile',
      preferredCurrency: 'CLP'
    });
    await users.linkTelegramChatByPhone(user.phoneNumber, '999');
    await categories.ensureDefaults(user.tenantId);
    const tenantCategories = await categories.listByTenant(user.tenantId);
    const food = tenantCategories.find((category) => category.name === 'Food' && !category.parentId);
    if (!food) throw new Error('Missing Food category in test defaults.');

    await budgets.upsertMonthly({
      tenantId: user.tenantId,
      categoryId: food.id,
      amount: 100000,
      currency: 'CLP'
    });
    await expenses.create({
      tenantId: user.tenantId,
      userId: user.id,
      date: '2026-05-06T00:00:00.000Z',
      amount: 35000,
      currency: 'CLP',
      concept: 'Supermercado',
      categoryId: food.id,
      paymentMethod: { kind: 'cash' }
    });
    const incomes = new InMemoryIncomeRepository();
    await incomes.create({
      tenantId: user.tenantId,
      userId: user.id,
      date: '2026-05-02T00:00:00.000Z',
      amount: 150000,
      currency: 'CLP',
      concept: 'Sueldo'
    });

    const useCase = new ProcessInboundFinanceMessageUseCase(
      users,
      categories,
      expenses,
      incomes,
      budgets,
      new InMemoryBankOptionRepository(),
      new InMemoryPaymentMethodOptionRepository(),
      new InMemoryMessagingMessageAuditRepository(),
      new InMemoryMessagingPendingDraftRepository(),
      messaging,
      new DeterministicMessageInterpreter(),
      { now: () => new Date('2026-05-06T00:05:00.000Z') },
      { frontendPublicOrigin: 'https://expenses-tracker-easg.netlify.app' }
    );

    const result = await useCase.execute({
      providerMessageId: 'tg-budget-left',
      channel: 'telegram',
      fromPhoneNumber: 'tg:999',
      providerUserId: '999',
      replyTo: '999',
      message: 'cuánto dinero me queda'
    });

    expect(result.status).toBe('budget_status_sent');
    expect(messaging.messages.at(-1)?.body).toContain('Vane, Este es tu presupuesto para mayo de 2026:');
    expect(messaging.messages.at(-1)?.body).toContain('- Disponible total: $115.000');
    expect(messaging.messages.at(-1)?.body).toContain('Por categorías:');
    expect(messaging.messages.at(-1)?.body).toContain('- Food:');
    expect(messaging.messages.at(-1)?.body).toContain('  - Gastado $35.000 de $100.000.');
    expect(messaging.messages.at(-1)?.body).toContain('  - Disponible: $65.000.');
  });

  it('resolves bank and payment method aliases to catalog references when saving inbound expenses', async () => {
    const users = new InMemoryUserRepository();
    const categories = new InMemoryCategoryRepository();
    const expenses = new InMemoryExpenseRepository();
    const banks = new InMemoryBankOptionRepository();
    const paymentMethods = new InMemoryPaymentMethodOptionRepository();
    const user = await users.upsertByPhoneNumber({
      phoneNumber: '+56982439041',
      firstName: 'Test',
      lastName: 'User',
      preferredName: 'Vane',
      countryOfResidence: 'Chile',
      preferredCurrency: 'CLP'
    });
    await users.linkTelegramChatByPhone(user.phoneNumber, '999');
    await categories.ensureDefaults(user.tenantId);
    const useCase = new ProcessInboundFinanceMessageUseCase(
      users,
      categories,
      expenses,
      new InMemoryIncomeRepository(),
      new InMemoryBudgetRepository(),
      banks,
      paymentMethods,
      new InMemoryMessagingMessageAuditRepository(),
      new InMemoryMessagingPendingDraftRepository(),
      new NoopMessagingProvider(),
      new DeterministicMessageInterpreter(),
      { now: () => new Date('2026-05-06T00:00:00.000Z') },
      { frontendPublicOrigin: 'https://expenses-tracker-easg.netlify.app' }
    );

    const result = await useCase.execute({
      providerMessageId: 'tg-bank-alias',
      channel: 'telegram',
      fromPhoneNumber: 'tg:999',
      providerUserId: '999',
      replyTo: '999',
      message: '25.000 supermercado, tc bci'
    });

    expect(result.status).toBe('saved');
    const [expense] = await expenses.listRecent(user.tenantId, 10);
    const bankOptions = await banks.listByTenant(user.tenantId);
    const paymentOptions = await paymentMethods.listByTenant(user.tenantId);
    expect(expense.paymentMethod).toEqual({
      kind: 'card',
      cardType: 'credit',
      bank: 'Banco de Crédito e Inversiones'
    });
    expect(expense.bankOptionId).toBe(bankOptions.find((item) => item.name === 'Banco de Crédito e Inversiones')?.id);
    expect(expense.paymentMethodOptionId).toBe(paymentOptions.find((item) => item.name === 'Tarjeta de crédito')?.id);
  });
});

class NoopMessagingProvider implements MessagingProvider {
  async sendText() {
    return { skipped: true };
  }
}

class CapturingMessagingProvider implements MessagingProvider {
  readonly messages: Array<{ toPhoneNumber: string; body: string }> = [];

  async sendText(toPhoneNumber: string, body: string) {
    this.messages.push({ toPhoneNumber, body });
    return { captured: true };
  }
}

class FixedIncomeInterpreter implements MessageInterpreterPort {
  async interpret() {
    return {
      intent: 'create_income' as const,
      confidence: 0.9,
      amount: 1200000,
      currency: 'LDO',
      concept: 'sueldo',
      missingFields: [],
      needsConfirmation: false
    };
  }
}
