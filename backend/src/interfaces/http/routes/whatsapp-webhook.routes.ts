import type { Express } from 'express';
import type { AppContainer } from '../../../infrastructure/container.js';
import { WhatsAppWebhookController } from '../controllers/whatsapp-webhook.controller.js';
import { verifyMetaSignature } from '../middleware/meta-signature.middleware.js';
import { logWebhookAttempt } from '../middleware/webhook-logging.middleware.js';
import { asyncHandler } from '../utils.js';

export function registerWhatsAppWebhookRoutes(app: Express, container: AppContainer) {
  const controller = new WhatsAppWebhookController(container);

  app.get('/webhooks/whatsapp', controller.verify);
  app.post(
    '/webhooks/whatsapp',
    logWebhookAttempt(container),
    verifyMetaSignature(container),
    asyncHandler(controller.receive)
  );
}
