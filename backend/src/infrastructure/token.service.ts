import jwt from 'jsonwebtoken';
import type { TokenService } from '../application/ports.js';
import type { User } from '../domain/index.js';
import type { AppConfig } from './config.js';

export class JwtTokenService implements TokenService {
  constructor(private readonly config: AppConfig) {}

  signAccessToken(user: User, financialAccountId?: string) {
    return jwt.sign({ userId: user.id, tenantId: user.tenantId, financialAccountId }, this.config.jwtSecret, {
      expiresIn: this.config.jwtExpiresIn as jwt.SignOptions['expiresIn']
    });
  }

  signRefreshToken(user: User, financialAccountId?: string) {
    return jwt.sign({ userId: user.id, tenantId: user.tenantId, financialAccountId, type: 'refresh' }, this.config.jwtSecret, {
      expiresIn: `${this.config.refreshTokenExpiresInDays}d`
    });
  }

  signTelegramRegistrationIntent(phoneNumber: string) {
    return jwt.sign({ phoneNumber, type: 'telegram-registration-intent' }, this.config.jwtSecret, {
      expiresIn: '15m'
    });
  }

  verifyAccessToken(token: string) {
    const payload = jwt.verify(token, this.config.jwtSecret) as { userId: string; tenantId: string; financialAccountId?: string };
    return { userId: payload.userId, tenantId: payload.tenantId, financialAccountId: payload.financialAccountId };
  }

  verifyRefreshToken(token: string) {
    const payload = jwt.verify(token, this.config.jwtSecret) as { userId: string; tenantId: string; financialAccountId?: string; type?: string };
    if (payload.type !== 'refresh') {
      throw new Error('Invalid refresh token.');
    }
    return { userId: payload.userId, tenantId: payload.tenantId, financialAccountId: payload.financialAccountId };
  }

  verifyTelegramRegistrationIntent(token: string) {
    const payload = jwt.verify(token, this.config.jwtSecret) as { phoneNumber: string; type?: string };
    if (payload.type !== 'telegram-registration-intent' || !payload.phoneNumber) {
      throw new Error('Invalid Telegram registration intent token.');
    }
    return { phoneNumber: payload.phoneNumber };
  }
}
