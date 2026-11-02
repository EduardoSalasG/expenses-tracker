import type { PushSubscriptionRepository } from '../ports.js';

export class RegisterPushSubscriptionUseCase {
  constructor(private readonly subscriptions: Pick<PushSubscriptionRepository, 'upsert'>) {}

  async execute(input: { userId: string; endpoint: string; keys: { p256dh: string; auth: string } }) {
    await this.subscriptions.upsert({
      userId: input.userId,
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth
    });
  }
}
