export const DEFAULT_PUSH_DELIVERY_BATCH_SIZE = 100;
export const DEFAULT_PUSH_DELIVERY_POLL_INTERVAL_MS = 1000;

type Delivery = { id: string; subscriptionId: string; endpoint: string; p256dh: string; auth: string; payload: { title: string; body: string; url: string } };
type Dependencies = {
  deliveries: { takePending(limit: number): Promise<Delivery[]>; markSent(id: string): Promise<void>; markFailed(id: string, error: string): Promise<void> };
  subscriptions: { deactivate(id: string): Promise<void> };
  send: (delivery: Delivery) => Promise<unknown>;
  logger: { info(message: string, metadata?: Record<string, unknown>): void; warn(message: string, metadata?: Record<string, unknown>): void };
};

export function parsePushDeliveryWorkerSettings(env: NodeJS.ProcessEnv) {
  const number = (value: string | undefined, fallback: number) => Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : fallback;
  return { limit: number(env.PUSH_DELIVERY_BATCH_SIZE, DEFAULT_PUSH_DELIVERY_BATCH_SIZE), pollIntervalMs: Math.max(250, number(env.PUSH_DELIVERY_POLL_INTERVAL_MS, DEFAULT_PUSH_DELIVERY_POLL_INTERVAL_MS)) };
}

export async function processPushDeliveryBatch(dependencies: Dependencies, limit: number) {
  const deliveries = await dependencies.deliveries.takePending(limit);
  for (const delivery of deliveries) {
    try {
      await dependencies.send(delivery);
      await dependencies.deliveries.markSent(delivery.id);
      dependencies.logger.info('push_delivery_sent', { deliveryId: delivery.id });
    } catch (error) {
      const statusCode = typeof error === 'object' && error !== null && 'statusCode' in error ? Number((error as { statusCode: unknown }).statusCode) : undefined;
      if (statusCode === 404 || statusCode === 410) await dependencies.subscriptions.deactivate(delivery.subscriptionId);
      await dependencies.deliveries.markFailed(delivery.id, statusCode ? `Push provider returned ${statusCode}.` : 'Push provider failed.');
      dependencies.logger.warn('push_delivery_failed', { deliveryId: delivery.id, statusCode: statusCode ?? 'unknown' });
    }
  }
  return deliveries.length;
}
