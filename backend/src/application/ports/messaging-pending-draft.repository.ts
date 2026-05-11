import type { ConversationPendingDraft, TenantId } from '../../domain/index.js';

export interface MessagingPendingDraftRepository {
  findActive(tenantId: TenantId, userId: string, now: Date): Promise<ConversationPendingDraft | undefined>;
  upsert(input: Omit<ConversationPendingDraft, 'id'>): Promise<ConversationPendingDraft>;
  clear(tenantId: TenantId, userId: string): Promise<void>;
}
