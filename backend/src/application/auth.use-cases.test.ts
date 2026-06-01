import { describe, expect, it } from 'vitest';
import { RequestOtpUseCase, VerifyOtpUseCase } from './use-cases.js';
import {
  InMemoryCategoryRepository,
  InMemoryOtpRepository,
  InMemoryUserRepository
} from '../infrastructure/repositories/in-memory.js';
import type { MessagingProvider, TokenService } from './ports.js';
import type { User } from '../domain/index.js';

describe('auth use cases', () => {
  it('marks OTP requests for unknown phones as requiring registration', async () => {
    const users = new InMemoryUserRepository();
    const otps = new InMemoryOtpRepository();
    const useCase = new RequestOtpUseCase(users, otps, new CapturingMessagingProvider(), fixedClock());

    const result = await useCase.execute({ phoneNumber: '+56982439041', telegramChatId: '12345' });

    expect(result).toEqual({ sent: true, requiresRegistration: true });
  });

  it('marks OTP requests for existing users as OTP-only login', async () => {
    const users = new InMemoryUserRepository();
    await users.upsertByPhoneNumber({
      phoneNumber: '+56982439041',
      firstName: 'Existing',
      lastName: 'User',
      preferredName: 'Existing',
      email: 'existing@example.com',
      countryOfResidence: 'Chile',
      preferredCurrency: 'CLP'
    });
    const useCase = new RequestOtpUseCase(users, new InMemoryOtpRepository(), new CapturingMessagingProvider(), fixedClock());

    const result = await useCase.execute({ phoneNumber: '+56982439041', telegramChatId: '12345' });

    expect(result).toEqual({ sent: true, requiresRegistration: false });
  });

  it('can expose the OTP in development diagnostics when explicitly enabled', async () => {
    const useCase = new RequestOtpUseCase(
      new InMemoryUserRepository(),
      new InMemoryOtpRepository(),
      new CapturingMessagingProvider(),
      fixedClock(),
      { exposeOtpInResponse: true }
    );

    const result = await useCase.execute({ phoneNumber: '+56982439041', telegramChatId: '12345' });

    expect(result.sent).toBe(true);
    expect(result.debugCode).toMatch(/^\d{6}$/);
  });

  it('does not overwrite existing user profile during OTP verification', async () => {
    const users = new InMemoryUserRepository();
    const otps = new InMemoryOtpRepository();
    const categories = new InMemoryCategoryRepository();
    const existing = await users.upsertByPhoneNumber({
      phoneNumber: '+56982439041',
      firstName: 'Existing',
      lastName: 'User',
      preferredName: 'Existing',
      email: 'existing@example.com',
      countryOfResidence: 'Chile',
      preferredCurrency: 'CLP'
    });
    await otps.create(existing.phoneNumber, '123456', new Date('2026-05-10T00:10:00.000Z'));
    const messaging = new CapturingMessagingProvider();
    const useCase = new VerifyOtpUseCase(users, otps, categories, new FakeTokenService(), fixedClock(), messaging);

    const result = await useCase.execute({ phoneNumber: existing.phoneNumber, code: '123456' });

    expect(result.user.firstName).toBe('Existing');
    expect(result.user.lastName).toBe('User');
    expect(result.user.preferredName).toBe('Existing');
    expect(result.user.email).toBe('existing@example.com');
    expect(result.user.preferredCurrency).toBe('CLP');
    expect(messaging.messages).toEqual([]);
  });

  it('requires registration fields for new users during OTP verification', async () => {
    const otps = new InMemoryOtpRepository();
    await otps.create('+56982439041', '123456', new Date('2026-05-10T00:10:00.000Z'));
    const useCase = new VerifyOtpUseCase(
      new InMemoryUserRepository(),
      otps,
      new InMemoryCategoryRepository(),
      new FakeTokenService(),
      fixedClock(),
      new CapturingMessagingProvider()
    );

    await expect(useCase.execute({ phoneNumber: '+56982439041', code: '123456' }))
      .rejects.toThrow('Registration details are required for new users.');
  });

  it('sends a registration greeting with Telegram usage examples for new users', async () => {
    const users = new InMemoryUserRepository();
    const otps = new InMemoryOtpRepository();
    const messaging = new CapturingMessagingProvider();
    await otps.create('+56982439041', '123456', new Date('2026-05-10T00:10:00.000Z'));
    const useCase = new VerifyOtpUseCase(
      users,
      otps,
      new InMemoryCategoryRepository(),
      new FakeTokenService(),
      fixedClock(),
      messaging
    );

    const result = await useCase.execute({
      phoneNumber: '+56982439041',
      code: '123456',
      firstName: 'Eduardo',
      lastName: 'Salas',
      preferredName: 'Edu',
      email: 'eduardo@example.com',
      countryOfResidence: 'Chile',
      preferredCurrency: 'CLP',
      preferredLanguage: 'en',
      telegramChatId: '12345'
    });

    expect(result.user.preferredName).toBe('Edu');
    expect(messaging.messages).toHaveLength(1);
    expect(messaging.messages[0]).toEqual({
      toPhoneNumber: '12345',
      body: expect.stringContaining('Hi Edu, welcome to Expenses Tracker.')
    });
    expect(messaging.messages[0].body).toContain('20.000 classes at Bsoul');
    expect(messaging.messages[0].body).toContain('How much did I spend this month?');
  });
});

function fixedClock() {
  return { now: () => new Date('2026-05-10T00:00:00.000Z') };
}

class CapturingMessagingProvider implements MessagingProvider {
  readonly messages: Array<{ toPhoneNumber: string; body: string }> = [];

  async sendText(toPhoneNumber: string, body: string) {
    this.messages.push({ toPhoneNumber, body });
    return { captured: true };
  }
}

class FakeTokenService implements TokenService {
  signAccessToken(user: User) {
    return `access:${user.id}`;
  }

  signRefreshToken(user: User) {
    return `refresh:${user.id}`;
  }

  verifyAccessToken() {
    return { userId: 'user-id', tenantId: 'tenant-id' };
  }

  verifyRefreshToken() {
    return { userId: 'user-id', tenantId: 'tenant-id' };
  }
}
