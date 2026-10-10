import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DeterministicMessageInterpreter } from './message-interpreter.js';
import type { MessagingProvider } from './ports/index.js';
import { ProcessInboundFinanceMessageUseCase } from './use-cases/index.js';
import { loadConfig } from '../infrastructure/config.js';
import { createPool } from '../infrastructure/database.js';
import { backfillCategoryPreferences } from '../infrastructure/db-backfill-category-preferences.js';
import {
  PostgresBankOptionRepository,
  PostgresBudgetRepository,
  PostgresCategoryPreferenceRepository,
  PostgresCategoryRepository,
  PostgresExpenseRepository,
  PostgresFinancialAccountRepository,
  PostgresIncomeRepository,
  PostgresMessagingMessageAuditRepository,
  PostgresMessagingPendingDraftRepository,
  PostgresPaymentMethodOptionRepository,
  PostgresUserRepository
} from '../infrastructure/repositories/postgres.js';
import { CategoryPreferenceService } from './services/category-preference.service.js';

const runIntegration = process.env.RUN_DB_INTEGRATION_TESTS === 'true';
const describeIntegration = runIntegration ? describe : describe.skip;

describeIntegration('ProcessInboundFinanceMessageUseCase PostgreSQL integration', () => {
  it('backfills one unambiguous normalized historical preference idempotently without replacing an explicit correction', async () => {
    const { close, pool, users, financialAccounts, categories, expenses } = await createIntegrationContext();
    try {
      await applyCategoryPreferencesMigration(pool);
      const user = await users.upsertByPhoneNumber({
        phoneNumber: randomPhone(),
        firstName: 'Backfill',
        lastName: 'Preference',
        preferredName: 'Backfill',
        email: undefined,
        countryOfResidence: 'Chile',
        preferredCurrency: 'CLP',
        preferredLanguage: 'es'
      });
      const account = await financialAccounts.ensurePersonalAccount(user.id);
      await categories.ensureDefaults(user.tenantId);
      const category = (await categories.listByTenant(user.tenantId, account.id)).find((item) => !item.parentId);
      if (!category) throw new Error('Missing category for category-preference backfill integration test.');

      for (const concept of ['CAFÉ   CENTRAL', 'cafe central', 'Café-Central']) {
        await expenses.create({
          tenantId: user.tenantId,
          financialAccountId: account.id,
          userId: user.id,
          date: '2026-10-10T12:00:00.000Z',
          amount: 5000,
          currency: 'CLP',
          concept,
          categoryId: category.id,
          paymentMethod: { kind: 'cash' }
        });
      }

      const preferences = new PostgresCategoryPreferenceRepository(pool);
      const service = new CategoryPreferenceService(preferences);
      const first = await backfillCategoryPreferences({ pool, preferences: service });
      const learned = await service.resolve({ financialAccountId: account.id, concept: 'cafe central' });
      const second = await backfillCategoryPreferences({ pool, preferences: service });

      await service.recordConfirmedSelection({
        financialAccountId: account.id,
        concept: 'cafe central',
        categoryId: category.id,
        explicit: true
      });
      const third = await backfillCategoryPreferences({ pool, preferences: service });
      const explicit = await service.resolve({ financialAccountId: account.id, concept: 'cafe central' });

      expect(first).toMatchObject({ preferencesCreated: 1, ignoredAmbiguousGroups: 0 });
      expect(learned).toMatchObject({ source: 'historical_consensus', evidenceCount: 3, categoryId: category.id });
      expect(second).toMatchObject({ preferencesCreated: 0, evidenceRecorded: 0 });
      expect(third).toMatchObject({ preferencesCreated: 0, evidenceRecorded: 0 });
      expect(explicit).toMatchObject({ source: 'explicit_correction', categoryId: category.id });
    } finally {
      await close();
    }
  });

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
  const financialAccounts = new PostgresFinancialAccountRepository(pool);
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
    financialAccounts,
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
    pool,
    useCase,
    users,
    financialAccounts,
    categories,
    expenses,
    pendingDrafts,
    close: () => pool.end()
  };
}

async function applyCategoryPreferencesMigration(pool: ReturnType<typeof createPool>) {
  const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
  const migration = await readFile(
    path.resolve(currentDirectory, '../../../database/migrations/041_financial_account_category_preferences.sql'),
    'utf8'
  );
  await pool.query(migration);
  await pool.query(migration);
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
