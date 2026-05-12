import type { Express } from 'express';
import type { AppContainer } from '../../../infrastructure/container.js';
import { TelegramWebhookController } from '../controllers/telegram-webhook.controller.js';
import { InboundMessagingService } from '../services/inbound-messaging.service.js';
import { asyncHandler } from '../utils.js';

export function registerTelegramWebhookRoutes(app: Express, container: AppContainer) {
  const inboundMessaging = new InboundMessagingService(container);
  const controller = new TelegramWebhookController(inboundMessaging, container);

  app.post('/webhooks/telegram', asyncHandler(controller.receive));
}

