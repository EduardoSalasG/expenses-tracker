import { describe, expect, it, vi } from 'vitest';
import { requireAuth } from './middleware.js';
import type { AppContainer } from '../../infrastructure/container.js';

describe('requireAuth', () => {
  it('scopes the auth tenant to the active shared account tenant', async () => {
    const personalAccount = { id: 'personal-account-id', tenantId: 'personal-tenant-id' };
    const sharedAccount = { id: 'shared-account-id', tenantId: 'shared-tenant-id' };
    const next = vi.fn();
    const response = createResponse();

    const middleware = requireAuth({
      tokens: {
        verifyAccessToken: vi.fn(() => ({
          userId: 'user-id',
          tenantId: 'personal-tenant-id',
          financialAccountId: 'shared-account-id'
        }))
      },
      financialAccounts: {
        ensurePersonalAccount: vi.fn(async () => personalAccount),
        findAccessibleById: vi.fn(async () => ({
          account: sharedAccount,
          role: 'member'
        }))
      }
    } as unknown as AppContainer);

    const request = createRequest({
      authorization: 'Bearer token'
    });

    await middleware(request, response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect((request as { auth?: { tenantId: string; financialAccountId: string } }).auth).toEqual({
      userId: 'user-id',
      tenantId: 'shared-tenant-id',
      financialAccountId: 'shared-account-id'
    });
  });

  it('keeps the personal tenant when no shared account is active', async () => {
    const personalAccount = { id: 'personal-account-id', tenantId: 'personal-tenant-id' };
    const next = vi.fn();
    const response = createResponse();

    const middleware = requireAuth({
      tokens: {
        verifyAccessToken: vi.fn(() => ({
          userId: 'user-id',
          tenantId: 'personal-tenant-id'
        }))
      },
      financialAccounts: {
        ensurePersonalAccount: vi.fn(async () => personalAccount),
        findAccessibleById: vi.fn()
      }
    } as unknown as AppContainer);

    const request = createRequest({
      authorization: 'Bearer token'
    });

    await middleware(request, response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect((request as { auth?: { tenantId: string; financialAccountId: string } }).auth).toEqual({
      userId: 'user-id',
      tenantId: 'personal-tenant-id',
      financialAccountId: 'personal-account-id'
    });
  });
});

function createRequest(headers: Record<string, string>) {
  return {
    header(name: string) {
      return headers[name.toLowerCase()];
    }
  } as never;
}

function createResponse() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn()
  } as never;
}
