import webpush from 'web-push';
import { createContainer } from './container.js';
import { loadConfig } from './config.js';
import { parsePushDeliveryWorkerSettings, processPushDeliveryBatch } from './push-delivery-worker.js';

const config = loadConfig();
if (!config.vapidPublicKey || !config.vapidPrivateKey) throw new Error('VAPID keys are required to process Push deliveries.');
webpush.setVapidDetails(config.vapidSubject, config.vapidPublicKey, config.vapidPrivateKey);
const container = createContainer(config);
const settings = parsePushDeliveryWorkerSettings(process.env);
const controller = new AbortController();
const stop = () => controller.abort();
process.once('SIGTERM', stop); process.once('SIGINT', stop);
container.logger.info('push_delivery_worker_started', settings);
try {
  while (!controller.signal.aborted) {
    const processed = await processPushDeliveryBatch({
      deliveries: container.pushDeliveries, subscriptions: container.pushSubscriptions, logger: container.logger,
      send: (delivery) => webpush.sendNotification({ endpoint: delivery.endpoint, keys: { p256dh: delivery.p256dh, auth: delivery.auth } }, JSON.stringify(delivery.payload))
    }, settings.limit);
    if (processed === 0 && !controller.signal.aborted) await new Promise((resolve) => setTimeout(resolve, settings.pollIntervalMs));
  }
} finally {
  process.removeListener('SIGTERM', stop); process.removeListener('SIGINT', stop);
  await container.close();
  container.logger.info('push_delivery_worker_stopped');
}
