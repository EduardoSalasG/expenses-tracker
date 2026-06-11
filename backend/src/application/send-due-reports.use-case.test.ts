import { describe, expect, it } from 'vitest';
import { FinanceUseCases, SendDueReportsUseCase } from './use-cases.js';
import {
  InMemoryBudgetRepository,
  InMemoryCategoryRepository,
  InMemoryExpenseRepository,
  InMemoryIncomeRepository,
  InMemoryReportDispatchRepository,
  InMemoryUserRepository
} from '../infrastructure/repositories/in-memory.js';
import type { MessagingProvider } from './ports.js';

describe('SendDueReportsUseCase', () => {
  it('sends reports only to users with the selected frequency', async () => {
    const users = new InMemoryUserRepository();
    const categories = new InMemoryCategoryRepository();
    const expenses = new InMemoryExpenseRepository();
    const incomes = new InMemoryIncomeRepository();
    const budgets = new InMemoryBudgetRepository();
    const messaging = new CapturingMessagingProvider();
    const dispatches = new InMemoryReportDispatchRepository();
    const finance = new FinanceUseCases(expenses, incomes, budgets, categories);
    const user = await users.upsertByPhoneNumber({
      phoneNumber: '+56982439041',
      firstName: 'Report',
      lastName: 'User',
      preferredName: 'Report',
      countryOfResidence: 'Chile',
      preferredCurrency: 'CLP'
    });
    await users.linkTelegramChatByPhone(user.phoneNumber, 'telegram-1');
    await users.updateReportPreferences(user.id, ['monthly']);
    await categories.ensureDefaults(user.tenantId);
    const category = (await categories.listByTenant(user.tenantId))[0];
    await finance.createExpense({
      tenantId: user.tenantId,
      userId: user.id,
      date: '2026-05-06T12:00:00.000Z',
      amount: 12500,
      currency: 'CLP',
      concept: 'groceries',
      categoryId: category.id,
      paymentMethod: { kind: 'cash' }
    });
    await finance.createIncome({
      tenantId: user.tenantId,
      userId: user.id,
      date: '2026-05-01T12:00:00.000Z',
      amount: 100000,
      currency: 'CLP',
      concept: 'salary'
    });

    const useCase = new SendDueReportsUseCase(
      users,
      finance,
      messaging,
      dispatches,
      { now: () => new Date('2026-05-20T00:00:00.000Z') }
    );

    const result = await useCase.execute('monthly');

    expect(result.sent).toBe(1);
    expect(messaging.messages).toEqual([
      {
        toPhoneNumber: 'telegram-1',
        body: [
          'Report, Reporte mensual (2026-05)',
          'Ingresos: $100.000',
          'Gastos: $12.500',
          'Movimientos de ingreso: 1',
          'Movimientos de gasto: 1',
          'Variación por categoría vs período anterior:',
          '- Food: sube $12.500 (n/a).'
        ].join('\n')
      }
    ]);
  });

  it('does not send duplicate scheduled reports for the same user and period', async () => {
    const users = new InMemoryUserRepository();
    const categories = new InMemoryCategoryRepository();
    const expenses = new InMemoryExpenseRepository();
    const incomes = new InMemoryIncomeRepository();
    const budgets = new InMemoryBudgetRepository();
    const messaging = new CapturingMessagingProvider();
    const dispatches = new InMemoryReportDispatchRepository();
    const finance = new FinanceUseCases(expenses, incomes, budgets, categories);
    const user = await users.upsertByPhoneNumber({
      phoneNumber: '+56982439041',
      firstName: 'Report',
      lastName: 'User',
      preferredName: 'Report',
      countryOfResidence: 'Chile',
      preferredCurrency: 'CLP'
    });
    await users.linkTelegramChatByPhone(user.phoneNumber, 'telegram-1');
    await users.updateReportPreferences(user.id, ['monthly']);
    await categories.ensureDefaults(user.tenantId);
    const category = (await categories.listByTenant(user.tenantId))[0];
    await finance.createExpense({
      tenantId: user.tenantId,
      userId: user.id,
      date: '2026-05-06T12:00:00.000Z',
      amount: 12500,
      currency: 'CLP',
      concept: 'groceries',
      categoryId: category.id,
      paymentMethod: { kind: 'cash' }
    });

    const useCase = new SendDueReportsUseCase(
      users,
      finance,
      messaging,
      dispatches,
      { now: () => new Date('2026-05-20T00:00:00.000Z') }
    );

    const first = await useCase.execute('monthly');
    const second = await useCase.execute('monthly');

    expect(first.sent).toBe(1);
    expect(second.sent).toBe(0);
    expect(second.skipped).toBe(1);
    expect(messaging.messages).toHaveLength(1);
  });

  it('continues batch when one recipient fails and marks failure', async () => {
    const users = new InMemoryUserRepository();
    const categories = new InMemoryCategoryRepository();
    const expenses = new InMemoryExpenseRepository();
    const incomes = new InMemoryIncomeRepository();
    const budgets = new InMemoryBudgetRepository();
    const dispatches = new InMemoryReportDispatchRepository();
    const finance = new FinanceUseCases(expenses, incomes, budgets, categories);
    const okUser = await users.upsertByPhoneNumber({
      phoneNumber: '+56982439041',
      firstName: 'Ok',
      lastName: 'User',
      preferredName: 'Ok',
      countryOfResidence: 'Chile',
      preferredCurrency: 'CLP'
    });
    const failingUser = await users.upsertByPhoneNumber({
      phoneNumber: '+56911111111',
      firstName: 'Fail',
      lastName: 'User',
      preferredName: 'Fail',
      countryOfResidence: 'Chile',
      preferredCurrency: 'CLP'
    });
    await users.linkTelegramChatByPhone(okUser.phoneNumber, 'telegram-ok');
    await users.linkTelegramChatByPhone(failingUser.phoneNumber, 'telegram-fail');
    await users.updateReportPreferences(okUser.id, ['monthly']);
    await users.updateReportPreferences(failingUser.id, ['monthly']);
    await categories.ensureDefaults(okUser.tenantId);
    await categories.ensureDefaults(failingUser.tenantId);
    const okCategory = (await categories.listByTenant(okUser.tenantId))[0];
    const failCategory = (await categories.listByTenant(failingUser.tenantId))[0];
    await finance.createExpense({
      tenantId: okUser.tenantId,
      userId: okUser.id,
      date: '2026-05-06T12:00:00.000Z',
      amount: 5000,
      currency: 'CLP',
      concept: 'coffee',
      categoryId: okCategory.id,
      paymentMethod: { kind: 'cash' }
    });
    await finance.createExpense({
      tenantId: failingUser.tenantId,
      userId: failingUser.id,
      date: '2026-05-06T12:00:00.000Z',
      amount: 7000,
      currency: 'CLP',
      concept: 'snack',
      categoryId: failCategory.id,
      paymentMethod: { kind: 'cash' }
    });

    const messaging = new FailingPhoneMessagingProvider('telegram-fail');
    const useCase = new SendDueReportsUseCase(
      users,
      finance,
      messaging,
      dispatches,
      { now: () => new Date('2026-05-20T00:00:00.000Z') }
    );

    const result = await useCase.execute('monthly');

    expect(result.sent).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.failedRecipients[0].phoneNumber).toBe('+56911111111');
  });
});

class CapturingMessagingProvider implements MessagingProvider {
  readonly messages: Array<{ toPhoneNumber: string; body: string }> = [];

  async sendText(toPhoneNumber: string, body: string) {
    this.messages.push({ toPhoneNumber, body });
    return { captured: true };
  }
}

class FailingPhoneMessagingProvider implements MessagingProvider {
  readonly messages: Array<{ toPhoneNumber: string; body: string }> = [];

  constructor(private readonly failingPhoneNumber: string) {}

  async sendText(toPhoneNumber: string, body: string) {
    if (toPhoneNumber === this.failingPhoneNumber) {
      throw new Error('Meta rejected test send');
    }
    this.messages.push({ toPhoneNumber, body });
    return { captured: true };
  }
}
