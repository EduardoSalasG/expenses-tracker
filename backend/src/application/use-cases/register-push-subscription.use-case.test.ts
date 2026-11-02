import { describe, expect, it, vi } from 'vitest';
import { RegisterPushSubscriptionUseCase } from './register-push-subscription.use-case.js';

describe('RegisterPushSubscriptionUseCase', () => {
  it('stores an authenticated browser subscription for the current user', async () => {
    const subscriptions = { upsert: vi.fn().mockResolvedValue(undefined) };
    const useCase = new RegisterPushSubscriptionUseCase(subscriptions);

    await useCase.execute({
      userId: 'user-1',
      endpoint: 'https://push.example/subscription',
      keys: { p256dh: 'public-key', auth: 'auth-key' }
    });

    expect(subscriptions.upsert).toHaveBeenCalledWith({
      userId: 'user-1',
      endpoint: 'https://push.example/subscription',
      p256dh: 'public-key',
      auth: 'auth-key'
    });
  });
});
