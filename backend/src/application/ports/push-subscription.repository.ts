export interface PushSubscriptionRecord {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  status: 'active' | 'inactive';
}

export interface PushSubscriptionRepository {
  upsert(input: Omit<PushSubscriptionRecord, 'id' | 'status'>): Promise<void>;
  listActiveByUserIds(userIds: string[]): Promise<PushSubscriptionRecord[]>;
  deactivate(id: string): Promise<void>;
  deactivateByUserAndEndpoint(userId: string, endpoint: string): Promise<void>;
}
