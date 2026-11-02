import { describe, expect, it, vi } from 'vitest';
import { QueueSharedExpensePushUseCase } from './queue-shared-expense-push.use-case.js';

describe('QueueSharedExpensePushUseCase', () => {
  it('enqueues one idempotent delivery for every active subscribed member of a shared account', async () => {
    const deliveries = { enqueue: vi.fn().mockResolvedValue(undefined) };
    const useCase = new QueueSharedExpensePushUseCase(
      { findById: vi.fn().mockResolvedValue({ id: 'account-1', type: 'shared', name: 'Casa' }), listMembers: vi.fn().mockResolvedValue([
        { userId: 'user-1', status: 'active' }, { userId: 'user-2', status: 'active' }, { userId: 'user-3', status: 'removed' }
      ]) },
      { listActiveByUserIds: vi.fn().mockResolvedValue([{ id: 'subscription-1', userId: 'user-1' }, { id: 'subscription-2', userId: 'user-2' }]) },
      deliveries
    );

    await useCase.execute({ id: 'expense-1', financialAccountId: 'account-1', concept: 'Frutas y verduras', amount: 5000, currency: 'CLP' });

    expect(deliveries.enqueue).toHaveBeenCalledTimes(2);
    expect(deliveries.enqueue).toHaveBeenCalledWith(expect.objectContaining({
      expenseId: 'expense-1', subscriptionId: 'subscription-1', payload: expect.objectContaining({ title: 'Gasto creado - cuenta Casa', body: 'Frutas y verduras 5.000 CLP' })
    }));
  });

  it('does not enqueue a delivery for personal accounts', async () => {
    const deliveries = { enqueue: vi.fn() };
    const useCase = new QueueSharedExpensePushUseCase(
      { findById: vi.fn().mockResolvedValue({ id: 'account-1', type: 'personal', name: 'Personal' }), listMembers: vi.fn() },
      { listActiveByUserIds: vi.fn() },
      deliveries
    );

    await useCase.execute({ id: 'expense-1', financialAccountId: 'account-1', concept: 'Pan', amount: 1000, currency: 'CLP' });

    expect(deliveries.enqueue).not.toHaveBeenCalled();
  });
});
