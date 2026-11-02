import { describe, expect, it, vi } from 'vitest';
import { processPushDeliveryBatch } from './push-delivery-worker.js';

describe('processPushDeliveryBatch', () => {
  it('sends a delivery and deactivates only permanently invalid subscriptions', async () => {
    const markSent = vi.fn(); const markFailed = vi.fn(); const deactivate = vi.fn();
    const logger = { info: vi.fn(), warn: vi.fn() };
    const sent = await processPushDeliveryBatch({
      deliveries: { takePending: async () => [{ id: 'one', subscriptionId: 'sub-one', endpoint: 'https://push.test', p256dh: 'key', auth: 'auth', payload: { title: 'Gasto creado', body: 'Casa', url: '/expenses' } }], markSent, markFailed },
      subscriptions: { deactivate }, logger,
      send: vi.fn().mockRejectedValue({ statusCode: 410 })
    }, 10);
    expect(sent).toBe(1);
    expect(deactivate).toHaveBeenCalledWith('sub-one');
    expect(markFailed).toHaveBeenCalledWith('one', 'Push provider returned 410.');
    expect(markSent).not.toHaveBeenCalled();
  });
});
