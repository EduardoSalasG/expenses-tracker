import { describe, expect, it } from 'vitest';
import { FinanceUseCases, SendDueReportsUseCase } from './use-cases.js';
import {
  InMemoryBudgetRepository,
  InMemoryCategoryRepository,
  InMemoryExpenseRepository,
  InMemoryIncomeRepository,
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
    const finance = new FinanceUseCases(expenses, incomes, budgets, categories);
    const user = await users.upsertByPhoneNumber({
      phoneNumber: '+56982439041',
      firstName: 'Report',
      lastName: 'User',
      preferredName: 'Report',
      countryOfResidence: 'Chile',
      preferredCurrency: 'CLP'
    });
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
      { now: () => new Date('2026-05-20T00:00:00.000Z') }
    );

    const result = await useCase.execute('monthly');

    expect(result.sent).toBe(1);
    expect(messaging.messages).toEqual([
      {
        toPhoneNumber: '+56982439041',
        body: [
          'Report, Reporte mensual (2026-05)',
          'Ingresos: $100.000',
          'Gastos: $12.500',
          'Movimientos de ingreso: 1',
          'Movimientos de gasto: 1'
        ].join('\n')
      }
    ]);
  });
});

class CapturingMessagingProvider implements MessagingProvider {
  readonly messages: Array<{ toPhoneNumber: string; body: string }> = [];

  async sendText(toPhoneNumber: string, body: string) {
    this.messages.push({ toPhoneNumber, body });
    return { captured: true };
  }
}
