import type { NextFunction, Request, Response } from 'express';
import type { AppContainer } from '../../infrastructure/container.js';
import { AppError } from '../../application/app-error.js';

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
      next(new AppError(401, 'AUTH_REQUIRED', 'Authentication required.'));
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
          next(new AppError(403, 'ACCOUNT_FORBIDDEN', 'Financial account is not accessible.'));
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
      next(new AppError(401, 'AUTH_INVALID', 'Authentication failed.'));
    }
  };
}
