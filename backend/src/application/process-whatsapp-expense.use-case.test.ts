import { describe, expect, it } from 'vitest';
import { ProcessWhatsAppExpenseUseCase } from './use-cases.js';
import {
  InMemoryCategoryRepository,
  InMemoryExpenseRepository,
  InMemoryUserRepository,
  InMemoryWhatsAppMessageAuditRepository
} from '../infrastructure/repositories/in-memory.js';
import type { WhatsAppProvider } from './ports.js';

describe('ProcessWhatsAppExpenseUseCase', () => {
  it('audits and ignores unregistered senders', async () => {
    const audits = new InMemoryWhatsAppMessageAuditRepository();
    const useCase = new ProcessWhatsAppExpenseUseCase(
      new InMemoryUserRepository(),
      new InMemoryCategoryRepository(),
      new InMemoryExpenseRepository(),
      audits,
      new NoopWhatsAppProvider(),
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
      audits,
      new NoopWhatsAppProvider(),
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
});

class NoopWhatsAppProvider implements WhatsAppProvider {
  async sendText() {
    return { skipped: true };
  }
}
