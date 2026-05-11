import type { Request, Response } from 'express';
import { extractWhatsAppMessages, extractWhatsAppStatuses } from '../messaging-providers/whatsapp.extractor.js';
import type { InboundMessagingService } from '../services/inbound-messaging.service.js';

export class WhatsAppWebhookController {
  constructor(
    private readonly verifyToken: string,
    private readonly inboundMessaging: InboundMessagingService
  ) {}

  verify = (request: Request, response: Response) => {
    const mode = request.query['hub.mode'];
    const token = request.query['hub.verify_token'];
    const challenge = request.query['hub.challenge'];
    if (mode === 'subscribe' && token === this.verifyToken) {
      response.status(200).send(challenge);
      return;
    }
    response.sendStatus(403);
  };

  receive = async (request: Request, response: Response) => {
    const messages = extractWhatsAppMessages(request.body);
    const statuses = extractWhatsAppStatuses(request.body);
    await this.inboundMessaging.receive({
      channel: 'whatsapp',
      providerName: 'WhatsApp',
      bodyShape: request.body?.entry ? 'entry_changes' : request.body?.field ? 'field_value' : 'unknown',
      messages,
      statuses
    });
    response.json({ received: true });
  };
}
