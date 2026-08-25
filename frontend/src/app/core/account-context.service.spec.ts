import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AccountContextService } from './account-context.service';
import { ApiService, type FinancialAccountContext } from './api.service';
import { AuthService } from './auth.service';

describe('AccountContextService', () => {
  const user = signal<{ id: string } | null>(null);
  const oldContext: FinancialAccountContext = {
    current: {
      account: {
        id: 'shared-account',
        tenantId: 'shared-tenant',
        type: 'shared',
        name: 'Casa',
        currency: 'CLP',
        createdByUserId: 'owner',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
      },
      role: 'member'
    },
    accounts: []
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AccountContextService,
        { provide: ApiService, useValue: {} },
        { provide: AuthService, useValue: { user } }
      ]
    });
  });

  it('clears the previous identity account context when the session user changes', () => {
    const service = TestBed.inject(AccountContextService);
    service.context.set(oldContext);

    user.set({ id: 'new-user' });
    TestBed.flushEffects();

    expect(service.context()).toBeNull();
    expect(service.activeAccountId()).toBe('');
  });

  it('can clear an already selected account explicitly', () => {
    const service = TestBed.inject(AccountContextService);
    service.context.set(oldContext);

    service.clear();

    expect(service.context()).toBeNull();
    expect(service.members()).toEqual([]);
  });
});
