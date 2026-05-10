import { describe, expect, it } from 'vitest';
import { RequestOtpUseCase, VerifyOtpUseCase } from './use-cases.js';
import {
  InMemoryCategoryRepository,
  InMemoryOtpRepository,
  InMemoryUserRepository
} from '../infrastructure/repositories/in-memory.js';
import type { TokenService, WhatsAppProvider } from './ports.js';
import type { User } from '../domain/types.js';

describe('auth use cases', () => {
  it('marks OTP requests for unknown phones as requiring registration', async () => {
    const users = new InMemoryUserRepository();
    const otps = new InMemoryOtpRepository();
    const useCase = new RequestOtpUseCase(users, otps, new CapturingWhatsAppProvider(), fixedClock());

    const result = await useCase.execute('+56982439041');

    expect(result).toEqual({ sent: true, requiresRegistration: true });
  });

  it('marks OTP requests for existing users as OTP-only login', async () => {
    const users = new InMemoryUserRepository();
    await users.upsertByPhoneNumber({
      phoneNumber: '+56982439041',
      name: 'Existing User',
      email: 'existing@example.com',
      countryOfResidence: 'Chile',
      preferredCurrency: 'CLP'
    });
    const useCase = new RequestOtpUseCase(users, new InMemoryOtpRepository(), new CapturingWhatsAppProvider(), fixedClock());

    const result = await useCase.execute('+56982439041');

    expect(result).toEqual({ sent: true, requiresRegistration: false });
  });

  it('does not overwrite existing user profile during OTP verification', async () => {
    const users = new InMemoryUserRepository();
    const otps = new InMemoryOtpRepository();
    const categories = new InMemoryCategoryRepository();
    const existing = await users.upsertByPhoneNumber({
      phoneNumber: '+56982439041',
      name: 'Existing User',
      email: 'existing@example.com',
      countryOfResidence: 'Chile',
      preferredCurrency: 'CLP'
    });
    await otps.create(existing.phoneNumber, '123456', new Date('2026-05-10T00:10:00.000Z'));
    const useCase = new VerifyOtpUseCase(users, otps, categories, new FakeTokenService(), fixedClock());

    const result = await useCase.execute({ phoneNumber: existing.phoneNumber, code: '123456' });

    expect(result.user.name).toBe('Existing User');
    expect(result.user.email).toBe('existing@example.com');
    expect(result.user.preferredCurrency).toBe('CLP');
  });

  it('requires registration fields for new users during OTP verification', async () => {
    const otps = new InMemoryOtpRepository();
    await otps.create('+56982439041', '123456', new Date('2026-05-10T00:10:00.000Z'));
    const useCase = new VerifyOtpUseCase(
      new InMemoryUserRepository(),
      otps,
      new InMemoryCategoryRepository(),
      new FakeTokenService(),
      fixedClock()
    );

    await expect(useCase.execute({ phoneNumber: '+56982439041', code: '123456' }))
      .rejects.toThrow('Registration details are required for new users.');
  });
});

function fixedClock() {
  return { now: () => new Date('2026-05-10T00:00:00.000Z') };
}

class CapturingWhatsAppProvider implements WhatsAppProvider {
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
