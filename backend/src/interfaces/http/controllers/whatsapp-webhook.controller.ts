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
    const statuses = extractWhatsAppStatuses(request.body);
    this.container.logger.info('WhatsApp webhook received.', {
      extractedMessages: messages.length,
      extractedStatuses: statuses.length,
      bodyShape: request.body?.entry ? 'entry_changes' : request.body?.field ? 'field_value' : 'unknown'
    });
    for (const status of statuses) {
      this.container.logger.info('WhatsApp webhook delivery status received.', status);
    }
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

export interface WhatsAppDeliveryStatus {
  providerMessageId?: string;
  recipientPhoneNumber?: string;
  status: string;
  timestamp?: string;
  conversationId?: string;
  errors?: unknown[];
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

export function extractWhatsAppStatuses(body: any): WhatsAppDeliveryStatus[] {
  if (body?.field === 'messages' && body?.value?.statuses) {
    return statusesFromValue(body.value);
  }

  const entries = body?.entry ?? [];
  return entries.flatMap((entry: any) =>
    (entry?.changes ?? []).flatMap((change: any) =>
      statusesFromValue(change?.value)
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

function statusesFromValue(value: any): WhatsAppDeliveryStatus[] {
  return (value?.statuses ?? [])
    .map((status: any) => ({
      providerMessageId: status.id,
      recipientPhoneNumber: status.recipient_id ? normalizeWhatsAppPhone(status.recipient_id) : undefined,
      status: status.status,
      timestamp: status.timestamp,
      conversationId: status.conversation?.id,
      errors: status.errors
    }));
}

function normalizeWhatsAppPhone(phoneNumber: string): string {
  return phoneNumber?.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
}
