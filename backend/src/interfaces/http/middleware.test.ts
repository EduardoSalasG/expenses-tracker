import { describe, expect, it, vi } from 'vitest';
import { requireAuth } from './middleware.js';
import { errorMiddleware } from './middleware/error.middleware.js';
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

    await middleware(request, response as never, next);

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

    await middleware(request, response as never, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect((request as { auth?: { tenantId: string; financialAccountId: string } }).auth).toEqual({
      userId: 'user-id',
      tenantId: 'personal-tenant-id',
      financialAccountId: 'personal-account-id'
    });
  });
});

describe('errorMiddleware', () => {
  it('returns an opaque 500 response with a request ID for unexpected failures', () => {
    const response = createResponse();
    const logger = { error: vi.fn() };
    const middleware = errorMiddleware({ logger } as unknown as AppContainer);

    middleware(new Error('database password leaked'), { id: 'req-123' } as never, response as never, vi.fn());

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      error: 'Internal server error.',
      requestId: 'req-123'
    });
    expect(logger.error).toHaveBeenCalledWith('HTTP error', expect.objectContaining({ requestId: 'req-123' }));
  });

  it('does not send tokens, webhook bodies, or secret-bearing error details to the logger', () => {
    const response = createResponse();
    const logger = { error: vi.fn() };
    const middleware = errorMiddleware({ logger } as unknown as AppContainer);
    const error = Object.assign(new Error('Bearer access-token-should-not-be-logged'), {
      webhookBody: { authorization: 'Bearer webhook-token-should-not-be-logged' },
      databaseUrl: 'postgres://user:database-secret-should-not-be-logged@db/app'
    });

    middleware(error, { id: 'req-safe-log' } as never, response as never, vi.fn());

    const serializedLog = JSON.stringify(logger.error.mock.calls[0]);
    expect(serializedLog).not.toContain('access-token-should-not-be-logged');
    expect(serializedLog).not.toContain('webhook-token-should-not-be-logged');
    expect(serializedLog).not.toContain('database-secret-should-not-be-logged');
    expect(serializedLog).toContain('req-safe-log');
  });

  it('returns the declared status and stable code for an expected application error', () => {
    const response = createResponse();
    const middleware = errorMiddleware({ logger: { error: vi.fn() } } as unknown as AppContainer);
    const error = Object.assign(new Error('Member already exists.'), { status: 409, code: 'MEMBER_CONFLICT' });

    middleware(error, { id: 'req-456' } as never, response as never, vi.fn());

    expect(response.status).toHaveBeenCalledWith(409);
    expect(response.json).toHaveBeenCalledWith({
      error: 'Member already exists.',
      code: 'MEMBER_CONFLICT',
      requestId: 'req-456'
    });
  });

  it.each([
    [403, 'ACCOUNT_FORBIDDEN'],
    [404, 'RESOURCE_NOT_FOUND'],
    [422, 'DOMAIN_RULE_VIOLATION']
  ] as const)('preserves the %i contract for %s', (status, code) => {
    const response = createResponse();
    const middleware = errorMiddleware({ logger: { error: vi.fn() } } as unknown as AppContainer);
    const error = Object.assign(new Error('Expected application failure.'), { status, code });

    middleware(error, { id: 'req-contract' } as never, response as never, vi.fn());

    expect(response.status).toHaveBeenCalledWith(status);
    expect(response.json).toHaveBeenCalledWith({
      error: 'Expected application failure.',
      code,
      requestId: 'req-contract'
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
    set: vi.fn().mockReturnThis(),
    json: vi.fn()
  };
}
