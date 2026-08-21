import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AccountContextService } from '../core/account-context.service';
import { formatFinancialAccountLabel } from '../core/account-label';
import { I18nService } from '../core/i18n.service';
import { AccountCreateDialogComponent, type AccountCreateDialogResult } from '../shared/components/account-create-dialog.component';

const links = [
  ['/dashboard', 'nav_dashboard', 'nav_home_short', 'dashboard'],
  ['/expenses', 'nav_expenses', 'nav_spend_short', 'receipt_long'],
  ['/incomes', 'nav_incomes', 'nav_income_short', 'payments'],
  ['/budgets', 'nav_budgets', 'nav_budget_short', 'account_balance_wallet'],
  ['/categories', 'nav_categories', 'nav_categories_short', 'category'],
  ['/settings', 'nav_settings', 'nav_settings_short', 'settings']
] as const;

const CREATE_SHARED_ACCOUNT_OPTION = '__create_shared_account__';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatDialogModule, MatFormFieldModule, MatIconModule, MatSelectModule, MatToolbarModule],
  template: `
    <mat-toolbar class="fixed left-0 right-0 top-0 z-30 !h-auto !min-h-16 border-b border-brand-border !bg-brand-surface !px-4 !py-3 !font-sans !text-brand-ink md:!h-[88px] md:!min-h-[88px] md:!py-3">
      <div class="flex w-full flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div class="flex min-w-0 items-center gap-3 overflow-hidden">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-brand-navy text-sm font-semibold text-white">ET</div>
          <span class="truncate font-semibold">{{ t('app_name') }}</span>
        </div>
        @if (accountService.accounts().length > 0) {
          <mat-form-field appearance="outline" class="account-switcher w-full md:mt-2 md:min-w-[260px] md:max-w-[320px]">
            <mat-label>{{ t('accounts_current_account') }}</mat-label>
            <mat-select
              id="shell-account-switcher"
              name="shellAccountSwitcher"
              panelClass="account-switcher-panel"
              [value]="currentAccountId()"
              [disabled]="accountService.loading()"
              (selectionChange)="switchAccountSelection($event)"
            >
              @for (membership of accountService.accounts(); track membership.account.id) {
                <mat-option [value]="membership.account.id">
                  {{ formatAccountLabel(membership.account.name, membership.account.type) }}
                </mat-option>
              }
              <mat-option [value]="createSharedAccountOption">{{ t('accounts_create_selector_option') }}</mat-option>
            </mat-select>
          </mat-form-field>
        }
      </div>
    </mat-toolbar>
    <div class="app-surface min-h-screen pt-28 md:grid md:min-h-[calc(100vh-88px)] md:grid-cols-[260px_minmax(0,1fr)] md:pt-[88px]">
      <nav class="shell-desktop-nav">
        @for (link of links; track link[0]) {
          <a
            [routerLink]="link[0]"
            [attr.aria-label]="t(link[1])"
            routerLinkActive="bg-brand-navy/10 !text-brand-navy"
            [routerLinkActiveOptions]="{ exact: true }"
            class="shell-nav-link"
          >
            <mat-icon class="shell-nav-icon">{{ link[3] }}</mat-icon>
            <span class="min-w-0 flex-1 truncate">{{ t(link[1]) }}</span>
          </a>
        }
      </nav>
      <nav class="shell-mobile-nav">
        @for (link of links; track link[0]) {
          <a
            [routerLink]="link[0]"
            [attr.aria-label]="t(link[1])"
            routerLinkActive="bg-brand-navy/10 !text-brand-navy"
            [routerLinkActiveOptions]="{ exact: true }"
            class="shell-mobile-link"
          >
            <mat-icon class="shell-nav-icon shell-nav-icon--mobile">{{ link[3] }}</mat-icon>
            <span class="block min-w-0 text-[0.7rem] font-medium leading-tight">{{ t(link[2]) }}</span>
          </a>
        }
      </nav>

      <section class="min-w-0 px-3 pb-28 pt-4 md:px-8 md:pb-10 md:pt-8">
        <router-outlet></router-outlet>
      </section>
    </div>
  `
})
export class ShellComponent implements OnInit {
  readonly createSharedAccountOption = CREATE_SHARED_ACCOUNT_OPTION;

  constructor(
    readonly accountService: AccountContextService,
    private readonly i18n: I18nService,
    private readonly dialog: MatDialog
  ) {}

  readonly links = links;

  ngOnInit() {
    this.accountService.load().subscribe({
      next: () => {},
      error: () => {}
    });
  }

  switchAccount(financialAccountId: string) {
    if (financialAccountId === CREATE_SHARED_ACCOUNT_OPTION) {
      this.openCreateAccountDialog();
      return;
    }
    if (!financialAccountId || financialAccountId === this.currentAccountId()) return;
    this.accountService.switchAccount(financialAccountId).subscribe({
      next: () => {},
      error: () => {}
    });
  }

  t(key: string) {
    return this.i18n.t(key);
  }

  formatAccountLabel(name: string, type: 'personal' | 'shared') {
    return formatFinancialAccountLabel(name, type, this.t('accounts_type_shared'));
  }

  currentAccountId() {
    return this.accountService.activeAccountId();
  }

  private openCreateAccountDialog() {
    const dialogRef = this.dialog.open(AccountCreateDialogComponent, {
      width: 'min(720px, calc(100vw - 1.5rem))',
      maxWidth: 'calc(100vw - 1.5rem)',
      panelClass: 'brand-dialog-panel',
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe((result: AccountCreateDialogResult | undefined) => {
      const createdAccountId = result?.createdAccountId;
      if (!createdAccountId) return;
      this.accountService.switchAccount(createdAccountId).subscribe({
        next: () => {},
        error: () => {}
      });
    });
  }

  switchAccountSelection(event: MatSelectChange) {
    const value = String(event.value ?? '');
    if (!value) return;
    if (value === CREATE_SHARED_ACCOUNT_OPTION) {
      event.source.writeValue(this.currentAccountId());
    }
    this.switchAccount(value);
  }
}
