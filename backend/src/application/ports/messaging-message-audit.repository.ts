import type { MessagingChannel } from '../../domain/index.js';

export interface MessagingMessageAuditRepository {
  reserve(input: {
    providerMessageId: string;
    channel?: MessagingChannel;
    fromPhoneNumber: string;
    message: string;
  }): Promise<boolean>;
  updateByProviderMessageId(providerMessageId: string, input: {
    channel?: MessagingChannel;
    tenantId?: string;
    userId?: string;
    parsingStatus: 'saved' | 'needs_confirmation' | 'unknown_user' | 'failed';
    expenseId?: string;
  }): Promise<void>;
  create(input: {
    providerMessageId?: string;
    channel?: MessagingChannel;
    tenantId?: string;
    userId?: string;
    fromPhoneNumber: string;
    message: string;
    parsingStatus: 'saved' | 'needs_confirmation' | 'unknown_user' | 'failed' | 'processing';
    expenseId?: string;
  }): Promise<void>;
}
