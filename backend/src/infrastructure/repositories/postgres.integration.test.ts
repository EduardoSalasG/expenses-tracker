import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../config.js';
import { createPool } from '../database.js';
import {
  PostgresCategoryRepository,
  PostgresExpenseRepository,
  PostgresMessagingMessageAuditRepository,
  PostgresReportDispatchRepository,
  PostgresUserRepository
} from './postgres.js';

const runIntegration = process.env.RUN_DB_INTEGRATION_TESTS === 'true';
const describeIntegration = runIntegration ? describe : describe.skip;

describeIntegration('Postgres repositories integration', () => {
  it('enforces tenant isolation for expenses list/read paths', async () => {
    const { pool, close } = createIntegrationContext();
    try {
      const users = new PostgresUserRepository(pool);
      const categories = new PostgresCategoryRepository(pool);
      const expenses = new PostgresExpenseRepository(pool);

      const userA = await users.upsertByPhoneNumber({
        phoneNumber: randomPhone(),
        firstName: 'Tenant',
        lastName: 'A',
        preferredName: 'A',
        email: undefined,
        countryOfResidence: 'Chile',
        preferredCurrency: 'CLP'
      });
      const userB = await users.upsertByPhoneNumber({
        phoneNumber: randomPhone(),
        firstName: 'Tenant',
        lastName: 'B',
        preferredName: 'B',
        email: undefined,
        countryOfResidence: 'Chile',
        preferredCurrency: 'CLP'
      });

      await categories.ensureDefaults(userA.tenantId);
      await categories.ensureDefaults(userB.tenantId);
      const categoryA = (await categories.listByTenant(userA.tenantId)).find((item) => !item.parentId);
      const categoryB = (await categories.listByTenant(userB.tenantId)).find((item) => !item.parentId);
      if (!categoryA || !categoryB) throw new Error('Missing default categories in integration test.');

      await expenses.create({
        tenantId: userA.tenantId,
        userId: userA.id,
        date: '2026-05-01T12:00:00.000Z',
        amount: 10000,
        currency: 'CLP',
        concept: 'tenant-a-expense',
        categoryId: categoryA.id,
        paymentMethod: { kind: 'cash' }
      });
      await expenses.create({
        tenantId: userB.tenantId,
        userId: userB.id,
        date: '2026-05-01T12:00:00.000Z',
        amount: 20000,
        currency: 'CLP',
        concept: 'tenant-b-expense',
        categoryId: categoryB.id,
        paymentMethod: { kind: 'cash' }
      });

      const tenantARecent = await expenses.listRecent(userA.tenantId, 10);
      const tenantBRecent = await expenses.listRecent(userB.tenantId, 10);

      expect(tenantARecent.some((item) => item.concept === 'tenant-a-expense')).toBe(true);
      expect(tenantARecent.some((item) => item.concept === 'tenant-b-expense')).toBe(false);
      expect(tenantBRecent.some((item) => item.concept === 'tenant-b-expense')).toBe(true);
      expect(tenantBRecent.some((item) => item.concept === 'tenant-a-expense')).toBe(false);
    } finally {
      await close();
    }
  });

  it('enforces idempotent audit reservation by channel + provider id', async () => {
    const { pool, close } = createIntegrationContext();
    try {
      const audits = new PostgresMessagingMessageAuditRepository(pool);
      const providerMessageId = `wamid.int-${randomUUID()}`;
      const first = await audits.reserve({
        providerMessageId,
        channel: 'whatsapp',
        fromPhoneNumber: randomPhone(),
        message: 'CLP 15000 groceries cash'
      });
      const second = await audits.reserve({
        providerMessageId,
        channel: 'whatsapp',
        fromPhoneNumber: randomPhone(),
        message: 'CLP 15000 groceries cash'
      });

      expect(first).toBe(true);
      expect(second).toBe(false);
    } finally {
      await close();
    }
  });

  it('avoids duplicate scheduled dispatch reservations and allows retry after failed', async () => {
    const { pool, close } = createIntegrationContext();
    try {
      await ensureReportDispatchesTable(pool);
      const users = new PostgresUserRepository(pool);
      const dispatches = new PostgresReportDispatchRepository(pool);
      const user = await users.upsertByPhoneNumber({
        phoneNumber: randomPhone(),
        firstName: 'Dispatch',
        lastName: 'User',
        preferredName: 'Dispatch',
        email: undefined,
        countryOfResidence: 'Chile',
        preferredCurrency: 'CLP'
      });
      const periodFrom = '2026-05-01T00:00:00.000Z';
      const periodTo = '2026-05-31T23:59:59.000Z';

      const firstReserve = await dispatches.reserve({
        tenantId: user.tenantId,
        userId: user.id,
        frequency: 'monthly',
        periodFrom,
        periodTo,
        channel: 'whatsapp'
      });
      const secondReserve = await dispatches.reserve({
        tenantId: user.tenantId,
        userId: user.id,
        frequency: 'monthly',
        periodFrom,
        periodTo,
        channel: 'whatsapp'
      });
      await dispatches.markFailed({
        userId: user.id,
        frequency: 'monthly',
        periodFrom,
        periodTo,
        channel: 'whatsapp',
        errorMessage: 'simulated'
      });
      const thirdReserveAfterFailure = await dispatches.reserve({
        tenantId: user.tenantId,
        userId: user.id,
        frequency: 'monthly',
        periodFrom,
        periodTo,
        channel: 'whatsapp'
      });

      expect(firstReserve).toBe(true);
      expect(secondReserve).toBe(false);
      expect(thirdReserveAfterFailure).toBe(true);
    } finally {
      await close();
    }
  });
});

function createIntegrationContext() {
  const config = loadConfig();
  const pool = createPool(config);
  return {
    pool,
    close: () => pool.end()
  };
}

function randomPhone() {
  const suffix = Math.floor(Math.random() * 1_000_000_000)
    .toString()
    .padStart(9, '0');
  return `+569${suffix}`;
}

async function ensureReportDispatchesTable(pool: ReturnType<typeof createPool>) {
  await pool.query(`
    create table if not exists report_dispatches (
      id uuid primary key default gen_random_uuid(),
      tenant_id uuid not null references tenants(id) on delete cascade,
      user_id uuid not null references users(id) on delete cascade,
      channel text not null default 'whatsapp',
      frequency text not null check (frequency in ('daily', 'weekly', 'monthly', 'yearly')),
      period_from timestamptz not null,
      period_to timestamptz not null,
      status text not null check (status in ('pending', 'sent', 'failed')),
      sent_at timestamptz,
      error_message text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);
  await pool.query(`
    create unique index if not exists report_dispatches_unique_active_idx
      on report_dispatches (channel, frequency, period_from, period_to, user_id)
      where status in ('pending', 'sent')
  `);
}
