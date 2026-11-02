import webpush from 'web-push';
import { loadConfig } from './config.js';
import { createContainer } from './container.js';

const config = loadConfig();
if (!config.vapidPublicKey || !config.vapidPrivateKey) throw new Error('VAPID keys are required to process Push deliveries.');
webpush.setVapidDetails(config.vapidSubject, config.vapidPublicKey, config.vapidPrivateKey);
const container = createContainer(config);

try {
  const deliveries = await container.pushDeliveries.takePending(100);
  for (const delivery of deliveries) {
    try {
      await webpush.sendNotification({ endpoint: delivery.endpoint, keys: { p256dh: delivery.p256dh, auth: delivery.auth } }, JSON.stringify(delivery.payload));
      await container.pushDeliveries.markSent(delivery.id);
      container.logger.info('push_delivery_sent', { deliveryId: delivery.id });
    } catch (error) {
      const statusCode = typeof error === 'object' && error !== null && 'statusCode' in error ? Number((error as { statusCode: unknown }).statusCode) : undefined;
      if (statusCode === 404 || statusCode === 410) await container.pushSubscriptions.deactivate(delivery.subscriptionId);
      await container.pushDeliveries.markFailed(delivery.id, statusCode ? `Push provider returned ${statusCode}.` : 'Push provider failed.');
      container.logger.warn('push_delivery_failed', { deliveryId: delivery.id, statusCode: statusCode ?? 'unknown' });
    }
  }
} finally {
  await container.close();
}
