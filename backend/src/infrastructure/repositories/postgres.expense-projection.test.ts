import { describe, expect, it, vi } from 'vitest';
import { PostgresExpenseRepository } from './postgres.js';

describe('PostgresExpenseRepository expense projection', () => {
  it('returns the original payer preferred name with a shared expense', async () => {
    const pool = {
      query: vi.fn().mockResolvedValue({
        rows: [{
          id: 'expense-1',
          tenant_id: 'tenant-1',
          financial_account_id: 'account-1',
          user_id: 'recorder-1',
          created_by_user_id: 'recorder-1',
          created_by_preferred_name: 'Ana',
          paid_by_user_id: 'payer-1',
          paid_by_preferred_name: 'Bruno',
          allocation_mode: 'equal',
          expense_date: '2026-10-01T00:00:00.000Z',
          amount: 12000,
          total_amount: 12000,
          currency: 'CLP',
          concept: 'Supermercado',
          category_id: 'category-1',
          payment_method_kind: 'cash'
        }]
      })
    };
    const repository = new PostgresExpenseRepository(pool as never);

    const [expense] = await repository.list({ tenantId: 'tenant-1', financialAccountId: 'account-1', limit: 10 });

    expect(expense).toMatchObject({
      createdByPreferredName: 'Ana',
      paidByUserId: 'payer-1',
      paidByPreferredName: 'Bruno'
    });
    expect(pool.query.mock.calls[0][0]).toContain('as paid_by_preferred_name');
  });
});
