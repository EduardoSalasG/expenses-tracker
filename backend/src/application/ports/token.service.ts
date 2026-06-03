import type { User } from '../../domain/index.js';

export interface TokenService {
  signAccessToken(user: User): string;
  signRefreshToken(user: User): string;
  signTelegramRegistrationIntent(phoneNumber: string): string;
  verifyAccessToken(token: string): { userId: string; tenantId: string };
  verifyRefreshToken(token: string): { userId: string; tenantId: string };
  verifyTelegramRegistrationIntent(token: string): { phoneNumber: string };
}
