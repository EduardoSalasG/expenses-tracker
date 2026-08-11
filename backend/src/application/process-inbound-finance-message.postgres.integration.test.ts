import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { DeterministicMessageInterpreter } from './message-interpreter.js';
import type { MessagingProvider } from './ports/index.js';
import { ProcessInboundFinanceMessageUseCase } from './use-cases/index.js';
import { loadConfig } from '../infrastructure/config.js';
import { createPool } from '../infrastructure/database.js';
import {
  PostgresBankOptionRepository,
  PostgresBudgetRepository,
  PostgresCategoryRepository,
  PostgresExpenseRepository,
  PostgresIncomeRepository,
  PostgresMessagingMessageAuditRepository,
  PostgresMessagingPendingDraftRepository,
  PostgresPaymentMethodOptionRepository,
  PostgresUserRepository
} from '../infrastructure/repositories/postgres.js';

const runIntegration = process.env.RUN_DB_INTEGRATION_TESTS === 'true';
const describeIntegration = runIntegration ? describe : describe.skip;

describeIntegration('ProcessInboundFinanceMessageUseCase PostgreSQL integration', () => {
  it('saves a Telegram-style expense into the local PostgreSQL database', async () => {
    const { close, useCase, users, categories, expenses } = await createIntegrationContext();
    try {
      const phoneNumber = randomPhone();
      const chatId = `qa-${randomUUID()}`;
      let user = await users.upsertByPhoneNumber({
        phoneNumber,
        firstName: 'Integration',
        lastName: 'Expense',
        preferredName: 'Integration',
        email: undefined,
        countryOfResidence: 'Chile',
        preferredCurrency: 'CLP',
        preferredLanguage: 'es'
      });
      await categories.ensureDefaults(user.tenantId);
      user = (await users.linkTelegramChatByPhone(phoneNumber, chatId, 'integration_expense')) ?? user;

      const result = await useCase.execute({
        providerMessageId: `qa-${randomUUID()}`,
        channel: 'telegram',
        fromPhoneNumber: `tg:${chatId}`,
        providerUserId: chatId,
        replyTo: chatId,
        message: '20.000 supermercado lider, transferencia desde bci'
      });

      const recent = await expenses.listRecent(user.tenantId, 5);

      expect(result.status).toBe('saved');
      expect(recent[0]?.concept).toBe('supermercado lider');
      expect(recent[0]?.paymentMethod.kind).toBe('transfer');
    } finally {
      await close();
    }
  });

  it('creates a pending draft when a movement is incomplete', async () => {
    const { close, useCase, users, categories, pendingDrafts } = await createIntegrationContext();
    try {
      const phoneNumber = randomPhone();
      const chatId = `qa-${randomUUID()}`;
      let user = await users.upsertByPhoneNumber({
        phoneNumber,
        firstName: 'Integration',
        lastName: 'Draft',
        preferredName: 'Integration',
        email: undefined,
        countryOfResidence: 'Chile',
        preferredCurrency: 'CLP',
        preferredLanguage: 'es'
      });
      await categories.ensureDefaults(user.tenantId);
      user = (await users.linkTelegramChatByPhone(phoneNumber, chatId, 'integration_draft')) ?? user;

      const result = await useCase.execute({
        providerMessageId: `qa-${randomUUID()}`,
        channel: 'telegram',
        fromPhoneNumber: `tg:${chatId}`,
        providerUserId: chatId,
        replyTo: chatId,
        message: '20.000 clases de bachata bsoul mayo'
      });

      const draft = await pendingDrafts.findActive(user.tenantId, user.id, new Date(), 'telegram');

      expect(result.status).toBe('needs_confirmation');
      expect(draft).toBeDefined();
      expect(draft?.missingFields.length).toBeGreaterThan(0);
    } finally {
      await close();
    }
  });
});

async function createIntegrationContext() {
  const config = loadConfig();
  const pool = createPool(config);
  const users = new PostgresUserRepository(pool);
  const categories = new PostgresCategoryRepository(pool);
  const expenses = new PostgresExpenseRepository(pool);
  const incomes = new PostgresIncomeRepository(pool);
  const budgets = new PostgresBudgetRepository(pool);
  const banks = new PostgresBankOptionRepository(pool);
  const paymentMethods = new PostgresPaymentMethodOptionRepository(pool);
  const messageAudits = new PostgresMessagingMessageAuditRepository(pool);
  const pendingDrafts = new PostgresMessagingPendingDraftRepository(pool);
  const messaging = new NoopMessagingProvider();
  const clock = { now: () => new Date() };

  const useCase = new ProcessInboundFinanceMessageUseCase(
    users,
    categories,
    expenses,
    incomes,
    budgets,
    banks,
    paymentMethods,
    messageAudits,
    pendingDrafts,
    messaging,
    new DeterministicMessageInterpreter(),
    clock,
    { frontendPublicOrigin: config.frontendPublicOrigin }
  );

  return {
    useCase,
    users,
    categories,
    expenses,
    pendingDrafts,
    close: () => pool.end()
  };
}

class NoopMessagingProvider implements MessagingProvider {
  async sendText() {
    return { ok: true };
  }
}

function randomPhone() {
  const suffix = Math.floor(Math.random() * 1_000_000_000)
    .toString()
    .padStart(9, '0');
  return `+569${suffix}`;
}
