import { Injectable, signal } from '@angular/core';
import { tap } from 'rxjs';
import {
  ApiService,
  type FinancialAccount,
  type FinancialAccountContext,
  type FinancialAccountMembership,
  type FinancialAccountMemberProfile
} from './api.service';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AccountContextService {
  readonly loading = signal(false);
  readonly error = signal('');
  readonly context = signal<FinancialAccountContext | null>(null);
  readonly members = signal<FinancialAccountMemberProfile[]>([]);
  readonly membersLoading = signal(false);
  readonly selectedAccountId = signal<string | null>(null);

  constructor(
    private readonly api: ApiService,
    private readonly auth: AuthService
  ) {}

  load() {
    this.loading.set(true);
    this.error.set('');
    return this.api.accountContext().pipe(
      tap({
        next: (context) => {
          this.context.set(context);
          this.selectedAccountId.set(context.current.account.id);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Could not load financial accounts.');
          this.loading.set(false);
        }
      })
    );
  }

  refreshMembers(accountId: string) {
    this.membersLoading.set(true);
    return this.api.listAccountMembers(accountId).pipe(
      tap({
        next: (members) => {
          this.members.set(members);
          this.membersLoading.set(false);
        },
        error: () => {
          this.members.set([]);
          this.membersLoading.set(false);
        }
      })
    );
  }

  switchAccount(financialAccountId: string) {
    return this.api.updateAccountContext(financialAccountId).pipe(
      tap((response) => {
        this.auth.updateSessionTokens(response.accessToken, response.refreshToken);
        const currentRole = this.context()?.accounts.find((item) => item.account.id === response.account.id)?.role ?? 'member';
        this.context.set({
          current: {
            account: response.account,
            role: currentRole
          },
          accounts: response.accounts
        });
        this.selectedAccountId.set(response.account.id);
      })
    );
  }

  currentAccount() {
    return this.context()?.current?.account ?? null;
  }

  currentMembership() {
    return this.context()?.current ?? null;
  }

  accounts() {
    return this.context()?.accounts ?? [];
  }

  updateLocalAccount(updated: FinancialAccount) {
    const current = this.context();
    if (!current) return;
    const accounts = current.accounts.map((membership) =>
      membership.account.id === updated.id
        ? { ...membership, account: updated }
        : membership
    );
    const currentMembership = current.current.account.id === updated.id
      ? { ...current.current, account: updated }
      : current.current;
    this.context.set({ current: currentMembership, accounts });
  }

  insertAccount(membership: FinancialAccountMembership) {
    const current = this.context();
    if (!current) {
      this.context.set({ current: membership, accounts: [membership] });
      this.selectedAccountId.set(membership.account.id);
      return;
    }
    this.context.set({
      current: current.current,
      accounts: [...current.accounts, membership].sort((left, right) => left.account.type.localeCompare(right.account.type) || left.account.name.localeCompare(right.account.name))
    });
  }
}
