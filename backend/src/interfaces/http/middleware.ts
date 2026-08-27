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
      const requestedFinancialAccountId = request.header('x-financial-account-id')?.trim() || undefined;
      const tokenFinancialAccountId = payload.financialAccountId?.trim() || undefined;
      let activeAccount = personalAccount;

      if (requestedFinancialAccountId) {
        const accessibleMembership = await container.financialAccounts.findAccessibleById(payload.userId, requestedFinancialAccountId);
        if (!accessibleMembership) {
          response.status(403).json({ error: 'Financial account is not accessible.' });
          return;
        }
        activeAccount = accessibleMembership.account;
      } else if (tokenFinancialAccountId) {
        const accessibleMembership = await container.financialAccounts.findAccessibleById(payload.userId, tokenFinancialAccountId);
        if (accessibleMembership) {
          activeAccount = accessibleMembership.account;
        }
      }

      (request as AuthenticatedRequest).auth = {
        ...payload,
        tenantId: activeAccount.tenantId,
        financialAccountId: activeAccount.id
      };
      next();
    } catch {
      response.status(401).json({ error: 'Invalid bearer token.' });
    }
  };
}
