import type { Request, Response } from 'express';
import type { AppContainer } from '../../../infrastructure/container.js';

export class WhatsAppWebhookController {
  constructor(private readonly container: AppContainer) {}

  verify = (request: Request, response: Response) => {
    const mode = request.query['hub.mode'];
    const token = request.query['hub.verify_token'];
    const challenge = request.query['hub.challenge'];
    if (mode === 'subscribe' && token === this.container.config.whatsappVerifyToken) {
      response.status(200).send(challenge);
      return;
    }
    response.sendStatus(403);
  };

  receive = async (request: Request, response: Response) => {
    const messages = extractWhatsAppMessages(request.body);
    this.container.logger.info('WhatsApp webhook received.', {
      extractedMessages: messages.length,
      bodyShape: request.body?.entry ? 'entry_changes' : request.body?.field ? 'field_value' : 'unknown'
    });
    for (const message of messages) {
      const result = await this.container.useCases.processWhatsAppExpense.execute(message);
      this.container.logger.info('WhatsApp webhook message processed.', {
        providerMessageId: message.providerMessageId,
        fromPhoneNumber: message.fromPhoneNumber,
        status: result.status
      });
    }
    response.json({ received: true });
  };
}

export function extractWhatsAppMessages(body: any): Array<{ providerMessageId?: string; fromPhoneNumber: string; message: string }> {
  if (body?.field === 'messages' && body?.value?.messages) {
    return messagesFromValue(body.value);
  }

  const entries = body?.entry ?? [];
  return entries.flatMap((entry: any) =>
    (entry?.changes ?? []).flatMap((change: any) =>
      messagesFromValue(change?.value)
    )
  );
}

function messagesFromValue(value: any): Array<{ providerMessageId?: string; fromPhoneNumber: string; message: string }> {
  return (value?.messages ?? [])
    .filter((message: any) => message.type === 'text')
    .map((message: any) => ({
      providerMessageId: message.id,
      fromPhoneNumber: normalizeWhatsAppPhone(message.from),
      message: message.text.body
    }));
}

function normalizeWhatsAppPhone(phoneNumber: string): string {
  return phoneNumber?.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
}
