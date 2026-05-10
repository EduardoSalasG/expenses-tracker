import type { User } from '../../domain/types.js';

export interface TokenService {
  signAccessToken(user: User): string;
  signRefreshToken(user: User): string;
  verifyAccessToken(token: string): { userId: string; tenantId: string };
  verifyRefreshToken(token: string): { userId: string; tenantId: string };
}
