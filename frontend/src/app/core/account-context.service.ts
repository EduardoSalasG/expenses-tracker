import { Injectable, computed, effect, signal } from '@angular/core';
import { tap } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import {
  ApiService,
  type FinancialAccount,
  type FinancialAccountContext,
  type FinancialAccountMembership,
  type FinancialAccountMemberProfile,
  type UpdateFinancialAccountContextResponse
} from './api.service';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AccountContextService {
  readonly loading = signal(false);
  readonly error = signal('');
  readonly context = signal<FinancialAccountContext | null>(null);
  readonly members = signal<FinancialAccountMemberProfile[]>([]);
  readonly membersLoading = signal(false);
  readonly activeMembership = computed(() => this.context()?.current ?? null);
  readonly activeAccount = computed(() => this.activeMembership()?.account ?? null);
  readonly activeAccountId = computed(() => this.activeAccount()?.id ?? '');
  readonly accountMemberships = computed(() => this.context()?.accounts ?? []);

  constructor(
    private readonly api: ApiService,
    private readonly auth: AuthService
  ) {
    // Account context belongs to the authenticated identity. Keeping it after
    // logout would send the next user an account header they cannot access.
    effect(() => {
      this.auth.user();
      this.clear();
    });
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    return this.api.accountContext().pipe(
      tap({
        next: (context) => {
          this.context.set(context);
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
    this.loading.set(true);
    this.error.set('');
    return this.api.updateAccountContext(financialAccountId).pipe(
      tap((response) => {
        this.auth.updateSessionTokens(response.accessToken, response.refreshToken);
        this.setContextFromSwitchResponse(response);
        this.members.set([]);
      }),
      switchMap(() => this.load()),
      tap({
        error: () => {
          this.error.set('Could not switch the active financial account.');
          this.loading.set(false);
        }
      }),
    );
  }

  currentAccount() {
    return this.context()?.current?.account ?? null;
  }

  currentMembership() {
    return this.context()?.current ?? null;
  }

  accounts() {
    return this.accountMemberships();
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
      return;
    }
    this.context.set({
      current: current.current,
      accounts: [...current.accounts, membership].sort((left, right) => left.account.type.localeCompare(right.account.type) || left.account.name.localeCompare(right.account.name))
    });
  }

  clear() {
    this.loading.set(false);
    this.error.set('');
    this.context.set(null);
    this.members.set([]);
    this.membersLoading.set(false);
  }

  private setContextFromSwitchResponse(response: UpdateFinancialAccountContextResponse) {
    const currentMembership =
      response.accounts.find((membership) => membership.account.id === response.account.id) ??
      {
        account: response.account,
        role: 'member' as const
      };

    const accounts = response.accounts.some((membership) => membership.account.id === response.account.id)
      ? response.accounts
      : [...response.accounts, currentMembership];

    this.context.set({
      current: currentMembership,
      accounts: accounts.sort(
        (left, right) =>
          left.account.type.localeCompare(right.account.type) ||
          left.account.name.localeCompare(right.account.name)
      )
    });
  }
}
