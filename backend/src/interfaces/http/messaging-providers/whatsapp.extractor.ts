import type { InboundTextMessage } from '../../../domain/index.js';
import type { InboundDeliveryStatus } from '../services/inbound-messaging.service.js';

export function extractWhatsAppMessages(body: any): InboundTextMessage[] {
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

export function extractWhatsAppStatuses(body: any): InboundDeliveryStatus[] {
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

function messagesFromValue(value: any): InboundTextMessage[] {
  return (value?.messages ?? [])
    .filter((message: any) => message.type === 'text')
    .map((message: any) => ({
      providerMessageId: message.id,
      channel: 'whatsapp',
      fromPhoneNumber: normalizeWhatsAppPhone(message.from),
      message: message.text.body
    }));
}

function statusesFromValue(value: any): InboundDeliveryStatus[] {
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
