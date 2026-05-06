import { describe, expect, it } from 'vitest';
import { ProcessWhatsAppExpenseUseCase } from './use-cases.js';
import {
  InMemoryCategoryRepository,
  InMemoryBudgetRepository,
  InMemoryExpenseRepository,
  InMemoryIncomeRepository,
  InMemoryUserRepository,
  InMemoryWhatsAppMessageAuditRepository
} from '../infrastructure/repositories/in-memory.js';
import { DeterministicMessageInterpreter } from './message-interpreter.js';
import type { WhatsAppProvider } from './ports.js';

describe('ProcessWhatsAppExpenseUseCase', () => {
  it('audits and ignores unregistered senders', async () => {
    const audits = new InMemoryWhatsAppMessageAuditRepository();
    const useCase = new ProcessWhatsAppExpenseUseCase(
      new InMemoryUserRepository(),
      new InMemoryCategoryRepository(),
      new InMemoryExpenseRepository(),
      new InMemoryIncomeRepository(),
      new InMemoryBudgetRepository(),
      audits,
      new NoopWhatsAppProvider(),
      new DeterministicMessageInterpreter(),
      { now: () => new Date('2026-05-06T00:00:00.000Z') }
    );

    const result = await useCase.execute({
      providerMessageId: 'wamid.test-unknown',
      fromPhoneNumber: '+16315551181',
      message: 'this is a text message'
    });

    expect(result.status).toBe('ignored_unregistered_sender');
    expect(audits.messages).toEqual([
      {
        providerMessageId: 'wamid.test-unknown',
        fromPhoneNumber: '+16315551181',
        message: 'this is a text message',
        parsingStatus: 'unknown_user'
      }
    ]);
  });

  it('ignores duplicate WhatsApp provider message ids before creating a second expense', async () => {
    const users = new InMemoryUserRepository();
    const categories = new InMemoryCategoryRepository();
    const expenses = new InMemoryExpenseRepository();
    const audits = new InMemoryWhatsAppMessageAuditRepository();
    const user = await users.upsertByPhoneNumber({
      phoneNumber: '+56982439041',
      name: 'Test User',
      countryOfResidence: 'Chile',
      preferredCurrency: 'CLP'
    });
    await categories.ensureDefaults(user.tenantId);
    const useCase = new ProcessWhatsAppExpenseUseCase(
      users,
      categories,
      expenses,
      new InMemoryIncomeRepository(),
      new InMemoryBudgetRepository(),
      audits,
      new NoopWhatsAppProvider(),
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

  it('saves income messages without creating expenses', async () => {
    const users = new InMemoryUserRepository();
    const categories = new InMemoryCategoryRepository();
    const expenses = new InMemoryExpenseRepository();
    const incomes = new InMemoryIncomeRepository();
    const audits = new InMemoryWhatsAppMessageAuditRepository();
    const user = await users.upsertByPhoneNumber({
      phoneNumber: '+56982439041',
      name: 'Test User',
      countryOfResidence: 'Chile',
      preferredCurrency: 'CLP'
    });
    await categories.ensureDefaults(user.tenantId);
    const useCase = new ProcessWhatsAppExpenseUseCase(
      users,
      categories,
      expenses,
      incomes,
      new InMemoryBudgetRepository(),
      audits,
      new NoopWhatsAppProvider(),
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
});

class NoopWhatsAppProvider implements WhatsAppProvider {
  async sendText() {
    return { skipped: true };
  }
}
