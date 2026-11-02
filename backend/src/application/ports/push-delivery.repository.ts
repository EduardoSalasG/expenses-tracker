export interface PushDeliveryRepository {
  enqueue(input: {
    expenseId: string;
    subscriptionId: string;
    payload: { title: string; body: string; url: string };
  }): Promise<void>;
  takePending(limit: number): Promise<Array<{ id: string; subscriptionId: string; endpoint: string; p256dh: string; auth: string; payload: { title: string; body: string; url: string } }>>;
  markSent(id: string): Promise<void>;
  markFailed(id: string, errorMessage: string): Promise<void>;
}
