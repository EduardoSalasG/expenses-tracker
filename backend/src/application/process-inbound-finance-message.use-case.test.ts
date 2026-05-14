import { describe, expect, it } from 'vitest';
import { ProcessInboundFinanceMessageUseCase } from './use-cases.js';
import {
  InMemoryCategoryRepository,
  InMemoryBudgetRepository,
  InMemoryExpenseRepository,
  InMemoryIncomeRepository,
  InMemoryUserRepository,
  InMemoryMessagingMessageAuditRepository,
  InMemoryMessagingPendingDraftRepository
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
      audits,
      new InMemoryMessagingPendingDraftRepository(),
      new NoopMessagingProvider(),
      new DeterministicMessageInterpreter(),
      { now: () => new Date('2026-05-06T00:00:00.000Z') }
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
      audits,
      new InMemoryMessagingPendingDraftRepository(),
      new NoopMessagingProvider(),
      new DeterministicMessageInterpreter(),
      { now: () => new Date('2026-05-06T00:00:00.000Z') }
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

  it('ignores recent duplicate text messages even with different provider ids', async () => {
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
      audits,
      new InMemoryMessagingPendingDraftRepository(),
      messaging,
      new DeterministicMessageInterpreter(),
      { now: () => new Date('2026-05-06T00:00:00.000Z') }
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

    expect(first.status).toBe('saved');
    expect(second.status).toBe('duplicate_ignored');
    expect(await expenses.listRecent(user.tenantId, 10)).toHaveLength(1);
    expect(messaging.messages.at(-1)?.body).toContain('posible mensaje duplicado reciente');
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
      audits,
      new InMemoryMessagingPendingDraftRepository(),
      new NoopMessagingProvider(),
      new DeterministicMessageInterpreter(),
      { now: () => new Date('2026-05-06T00:00:00.000Z') }
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
      new InMemoryMessagingMessageAuditRepository(),
      new InMemoryMessagingPendingDraftRepository(),
      messaging,
      new DeterministicMessageInterpreter(),
      { now: () => new Date('2026-05-06T00:00:00.000Z') }
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

  it('assigns dance classes to education dance when available', async () => {
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
      new InMemoryMessagingMessageAuditRepository(),
      new InMemoryMessagingPendingDraftRepository(),
      messaging,
      new DeterministicMessageInterpreter(),
      { now: () => new Date('2026-05-06T00:00:00.000Z') }
    );

    const result = await useCase.execute({
      providerMessageId: 'wamid.dance-category',
      fromPhoneNumber: '+56982439041',
      message: '20.000 clases de bachata bsoul mayo, transferencia desde bci'
    });

    expect(result.status).toBe('saved');
    const [expense] = await expenses.listRecent(user.tenantId, 10);
    const tenantCategories = await categories.listByTenant(user.tenantId);
    const education = tenantCategories.find((category) => category.name === 'Education' && !category.parentId);
    const dance = tenantCategories.find((category) => category.name === 'Dance' && category.parentId === education?.id);
    expect(expense.categoryId).toBe(education?.id);
    expect(expense.subcategoryId).toBe(dance?.id);
    expect(messaging.messages[0].body).toContain('Test, Gasto guardado.');
    expect(messaging.messages[0].body).toContain('Monto: $20.000.');
    expect(messaging.messages[0].body).toContain('Categoría: Education > Dance.');
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
      new InMemoryMessagingMessageAuditRepository(),
      new InMemoryMessagingPendingDraftRepository(),
      new NoopMessagingProvider(),
      new FixedIncomeInterpreter(),
      { now: () => new Date('2026-05-06T00:00:00.000Z') }
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
      new InMemoryMessagingMessageAuditRepository(),
      drafts,
      new NoopMessagingProvider(),
      new DeterministicMessageInterpreter(),
      { now: () => new Date('2026-05-06T00:00:00.000Z') }
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

    expect(first.status).toBe('needs_confirmation');
    expect(second.status).toBe('saved');
    const [expense] = await expenses.listRecent(user.tenantId, 10);
    expect(expense.amount).toBe(20000);
    expect(expense.concept).toBe('clases de bachata bsoul mayo');
    expect(expense.paymentMethod).toEqual({ kind: 'transfer', bank: 'bci', cardType: undefined });
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
      new InMemoryMessagingMessageAuditRepository(),
      new InMemoryMessagingPendingDraftRepository(),
      messaging,
      new DeterministicMessageInterpreter(),
      { now: () => new Date('2026-05-06T00:05:00.000Z') }
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
