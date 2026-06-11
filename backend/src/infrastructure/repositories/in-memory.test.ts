import { describe, expect, it } from 'vitest';
import { InMemoryExpenseRepository } from './in-memory.js';

describe('InMemoryExpenseRepository installments', () => {
  it('returns only multi-installment expenses in upcoming installment totals', async () => {
    const repository = new InMemoryExpenseRepository();

    await repository.create({
      tenantId: 'tenant-1',
      userId: 'user-1',
      date: '2026-06-15T00:00:00.000Z',
      firstInstallmentDate: '2026-06-15T00:00:00.000Z',
      amount: 30000,
      currency: 'CLP',
      concept: 'Phone in installments',
      categoryId: 'cat-1',
      paymentMethod: { kind: 'card', bank: 'bci', cardType: 'credit' },
      installmentCount: 3
    });

    await repository.create({
      tenantId: 'tenant-1',
      userId: 'user-1',
      date: '2026-06-10T00:00:00.000Z',
      amount: 5000,
      currency: 'CLP',
      concept: 'Single payment expense',
      categoryId: 'cat-1',
      paymentMethod: { kind: 'cash' },
      installmentCount: 1
    });

    const rows = await repository.upcomingInstallmentsMonthlyTotalsByTenant('tenant-1', '2026-06', 6);

    expect(rows).toEqual([
      { periodKey: '2026-06', currency: 'CLP', total: 10000 },
      { periodKey: '2026-07', currency: 'CLP', total: 10000 },
      { periodKey: '2026-08', currency: 'CLP', total: 10000 }
    ]);
  });
});
