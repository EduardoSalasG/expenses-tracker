import type { InboundTextMessage } from '../../../domain/index.js';
import type { InboundDeliveryStatus } from '../services/inbound-messaging.service.js';

type JsonRecord = Record<string, unknown>;

export function extractWhatsAppMessages(body: unknown): InboundTextMessage[] {
  return extractValues(body).flatMap(messagesFromValue);
}

export function extractWhatsAppStatuses(body: unknown): InboundDeliveryStatus[] {
  return extractValues(body).flatMap(statusesFromValue);
}

function extractValues(body: unknown): unknown[] {
  const webhook = asRecord(body);
  if (!webhook) return [];
  if (webhook.field === 'messages' && webhook.value) return [webhook.value];

  return asArray(webhook.entry).flatMap((entry) => {
    const entryRecord = asRecord(entry);
    return asArray(entryRecord?.changes).flatMap((change) => {
      const changeRecord = asRecord(change);
      return changeRecord?.value ? [changeRecord.value] : [];
    });
  });
}

function messagesFromValue(value: unknown): InboundTextMessage[] {
  const payload = asRecord(value);
  return asArray(payload?.messages).flatMap((message) => {
    const textMessage = asRecord(message);
    const text = asRecord(textMessage?.text);
    const fromPhoneNumber = asString(textMessage?.from);
    const body = asString(text?.body);
    if (textMessage?.type !== 'text' || !fromPhoneNumber || !body) return [];

    return [{
      providerMessageId: asString(textMessage.id),
      channel: 'whatsapp',
      fromPhoneNumber: normalizeWhatsAppPhone(fromPhoneNumber),
      message: body
    }];
  });
}

function statusesFromValue(value: unknown): InboundDeliveryStatus[] {
  const payload = asRecord(value);
  return asArray(payload?.statuses).flatMap((status) => {
    const delivery = asRecord(status);
    const deliveryStatus = asString(delivery?.status);
    if (!deliveryStatus) return [];

    const recipientId = asString(delivery?.recipient_id);
    const conversation = asRecord(delivery?.conversation);
    const errors = asArray(delivery?.errors);
    return [{
      providerMessageId: asString(delivery?.id),
      recipientPhoneNumber: recipientId ? normalizeWhatsAppPhone(recipientId) : undefined,
      status: deliveryStatus,
      timestamp: asString(delivery?.timestamp),
      conversationId: asString(conversation?.id),
      errors: errors.length > 0 ? errors : undefined
    }];
  });
}

function asRecord(value: unknown): JsonRecord | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : undefined;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function normalizeWhatsAppPhone(phoneNumber: string): string {
  return phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
}
