import type { NextFunction, Request, Response } from 'express';
import type { AppContainer } from '../../infrastructure/container.js';

export interface AuthenticatedRequest extends Request {
  auth: {
    userId: string;
    tenantId: string;
    financialAccountId: string;
  };
}

export function requireAuth(container: AppContainer) {
  return async (request: Request, response: Response, next: NextFunction) => {
    const authorization = request.header('authorization');
    const token = authorization?.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : undefined;
    if (!token) {
      response.status(401).json({ error: 'Missing bearer token.' });
      return;
    }

    try {
      const payload = container.tokens.verifyAccessToken(token);
      const personalAccount = await container.financialAccounts.ensurePersonalAccount(payload.userId);
      (request as AuthenticatedRequest).auth = {
        ...payload,
        financialAccountId: payload.financialAccountId ?? personalAccount.id
      };
      next();
    } catch {
      response.status(401).json({ error: 'Invalid bearer token.' });
    }
  };
}
