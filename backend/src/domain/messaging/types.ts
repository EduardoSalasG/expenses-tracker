import type { TenantId } from '../tenancy/index.js';
import type { UserId } from '../users/index.js';

export type MessagingChannel = 'whatsapp' | 'telegram';

export interface InboundTextMessage {
  providerMessageId?: string;
  fromPhoneNumber: string;
  message: string;
  channel?: MessagingChannel;
}

export interface ConversationPendingDraft {
  id: string;
  tenantId: TenantId;
  userId: UserId;
  originalMessage: string;
  draft: unknown;
  missingFields: string[];
  expiresAt: string;
  channel?: MessagingChannel;
}
