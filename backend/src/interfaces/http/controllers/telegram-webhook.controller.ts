import type { Request, Response } from 'express';
import { extractTelegramMessages, inferTelegramSender } from '../messaging-providers/telegram.extractor.js';
import type { InboundMessagingService } from '../services/inbound-messaging.service.js';
import type { AppContainer } from '../../../infrastructure/container.js';

export class TelegramWebhookController {
  constructor(
    private readonly inboundMessaging: InboundMessagingService,
    private readonly container: AppContainer
  ) {}

  receive = async (request: Request, response: Response) => {
    if (this.container.config.telegramWebhookSecretToken) {
      const receivedSecret = request.get('x-telegram-bot-api-secret-token');
      if (receivedSecret !== this.container.config.telegramWebhookSecretToken) {
        this.container.logger.warn('Telegram webhook rejected: invalid secret token.');
        response.status(401).json({ error: 'Invalid Telegram webhook secret token.' });
        return;
      }
    }

    const messages = extractTelegramMessages(request.body);

    if (messages.length === 0) {
      this.container.logger.info('Telegram webhook ignored: no text message.', {
        sender: inferTelegramSender(request.body),
        bodyShape: request.body?.message ? 'message' : 'unknown'
      });
      response.json({ received: true, ignored: true });
      return;
    }

    await this.inboundMessaging.receive({
      channel: 'telegram',
      providerName: 'Telegram',
      bodyShape: request.body?.message ? 'message' : 'unknown',
      messages,
      statuses: []
    });

    response.json({ received: true });
  };
}
