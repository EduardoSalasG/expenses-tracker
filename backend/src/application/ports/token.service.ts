import type { User } from '../../domain/index.js';

export interface TokenService {
  signAccessToken(user: User, financialAccountId?: string): string;
  signRefreshToken(user: User, financialAccountId?: string): string;
  signTelegramRegistrationIntent(phoneNumber: string): string;
  verifyAccessToken(token: string): { userId: string; tenantId: string; financialAccountId?: string };
  verifyRefreshToken(token: string): { userId: string; tenantId: string; financialAccountId?: string };
  verifyTelegramRegistrationIntent(token: string): { phoneNumber: string };
}
