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
    const messages = extractTelegramMessages(request.body);

    if (messages.length === 0) {
      this.container.logger.info('Telegram webhook ignored: no text with contact phone number.', {
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

