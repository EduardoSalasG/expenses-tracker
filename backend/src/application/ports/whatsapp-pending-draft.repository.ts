import type { TenantId, WhatsAppPendingDraft } from '../../domain/types.js';

export interface WhatsAppPendingDraftRepository {
  findActive(tenantId: TenantId, userId: string, now: Date): Promise<WhatsAppPendingDraft | undefined>;
  upsert(input: Omit<WhatsAppPendingDraft, 'id'>): Promise<WhatsAppPendingDraft>;
  clear(tenantId: TenantId, userId: string): Promise<void>;
}
