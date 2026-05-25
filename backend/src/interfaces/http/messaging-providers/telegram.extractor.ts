import type { InboundTextMessage } from '../../../domain/index.js';

export interface TelegramWebhookEnvelope {
  update_id?: number;
  message?: {
    message_id?: number;
    text?: string;
    chat?: {
      id?: number;
    };
    contact?: {
      phone_number?: string;
    };
    from?: {
      id?: number;
      username?: string;
    };
  };
}

export function extractTelegramMessages(body: TelegramWebhookEnvelope): InboundTextMessage[] {
  const text = body?.message?.text?.trim();
  if (!text) return [];

  const phoneNumber = normalizePhoneNumber(body?.message?.contact?.phone_number)
    ?? (body?.message?.from?.id ? `tg:${body.message.from.id}` : undefined);
  if (!phoneNumber) return [];

  return [{
    providerMessageId: body?.message?.message_id ? String(body.message.message_id) : undefined,
    channel: 'telegram',
    fromPhoneNumber: phoneNumber,
    providerUserId: body?.message?.from?.id ? String(body.message.from.id) : undefined,
    replyTo: body?.message?.chat?.id ? String(body.message.chat.id) : undefined,
    message: text
  }];
}

export function inferTelegramSender(body: TelegramWebhookEnvelope): string | undefined {
  return body?.message?.contact?.phone_number
    ?? body?.message?.from?.username
    ?? (body?.message?.from?.id ? String(body.message.from.id) : undefined);
}

function normalizePhoneNumber(raw?: string): string | undefined {
  if (!raw) return undefined;
  return raw.startsWith('+') ? raw : `+${raw}`;
}
