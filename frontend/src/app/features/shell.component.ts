import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AccountContextService } from '../core/account-context.service';
import { I18nService } from '../core/i18n.service';

const links = [
  ['dashboard', 'nav_dashboard', 'nav_home_short', 'dashboard'],
  ['expenses', 'nav_expenses', 'nav_spend_short', 'receipt_long'],
  ['incomes', 'nav_incomes', 'nav_income_short', 'payments'],
  ['budgets', 'nav_budgets', 'nav_budget_short', 'account_balance_wallet'],
  ['categories', 'nav_categories', 'nav_categories_short', 'category'],
  ['settings', 'nav_settings', 'nav_settings_short', 'settings']
] as const;

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatButtonModule, MatFormFieldModule, MatIconModule, MatToolbarModule, MatSelectModule],
  template: `
    <mat-toolbar class="fixed left-0 right-0 top-0 z-30 !h-16 !min-h-16 border-b border-brand-border !bg-brand-surface !text-brand-ink">
      <div class="flex min-w-0 flex-1 items-center gap-3">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-brand-navy text-sm font-semibold text-white">ET</div>
        <span class="truncate font-semibold">{{ t('app_name') }}</span>
      </div>
      @if (accountService.accounts().length > 0) {
        <mat-form-field appearance="outline" class="account-switcher hidden md:block">
          <mat-select
            name="activeFinancialAccount"
            aria-label="Active account"
            [value]="selectedAccountId()"
            (selectionChange)="switchAccount($event.value)">
            <mat-select-trigger>{{ selectedAccountLabel() }}</mat-select-trigger>
            @for (membership of accountService.accounts(); track membership.account.id) {
              <mat-option [value]="membership.account.id">
                {{ formatAccountLabel(membership.account.name, membership.account.type) }}
              </mat-option>
            }
          </mat-select>
        </mat-form-field>
      }
    </mat-toolbar>
    <div class="app-surface grid min-h-screen pt-16 md:grid-cols-[260px_1fr]">
      <nav class="fixed bottom-0 left-0 right-0 z-20 flex border-t border-brand-border bg-brand-surface/95 p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgb(7_11_18_/_0.10)] md:sticky md:top-16 md:block md:h-[calc(100vh-64px)] md:self-start md:overflow-y-auto md:border-r md:border-t-0 md:bg-brand-surface/90 md:p-3 md:shadow-none">
        @for (link of links; track link[0]) {
          <a
            mat-button
            [routerLink]="link[0]"
            [attr.aria-label]="t(link[1])"
            routerLinkActive="!bg-brand-navy/10 !text-brand-navy"
            class="!h-12 !min-w-0 !flex-1 !flex-col !px-1 !text-brand-muted md:!h-11 md:!w-full md:!flex-row md:!justify-start md:!px-4"
          >
            <mat-icon>{{ link[3] }}</mat-icon>
            <span class="mt-0.5 text-[11px] leading-none md:hidden">{{ t(link[2]) }}</span>
            <span class="hidden md:ml-2 md:inline md:text-sm">{{ t(link[1]) }}</span>
          </a>
        }
      </nav>
      <section class="min-w-0 px-3 pb-28 pt-4 sm:px-4 md:p-8">
        <router-outlet />
      </section>
    </div>
  `
})
export class ShellComponent implements OnInit {
  readonly selectedAccountId = signal<string | null>(null);

  constructor(
    readonly accountService: AccountContextService,
    private readonly i18n: I18nService,
    private readonly router: Router
  ) {}

  readonly links = links;

  ngOnInit() {
    this.accountService.load().subscribe({
      next: (context) => this.selectedAccountId.set(context.current.account.id),
      error: () => {}
    });
  }

  switchAccount(financialAccountId: string) {
    if (!financialAccountId || financialAccountId === this.selectedAccountId()) return;
    this.accountService.switchAccount(financialAccountId).subscribe({
      next: () => {
        this.selectedAccountId.set(financialAccountId);
        void this.reloadActiveRoute();
      },
      error: () => {}
    });
  }

  private async reloadActiveRoute() {
    const currentUrl = this.router.url || '/dashboard';
    const tempUrl = currentUrl.startsWith('/dashboard') ? '/settings' : '/dashboard';
    await this.router.navigateByUrl(tempUrl, { skipLocationChange: true });
    await this.router.navigateByUrl(currentUrl);
  }

  t(key: string) {
    return this.i18n.t(key);
  }

  selectedAccountLabel() {
    const membership = this.accountService.currentMembership();
    if (!membership) return '';
    return this.formatAccountLabel(membership.account.name, membership.account.type);
  }

  formatAccountLabel(name: string, type: 'personal' | 'shared') {
    if (type === 'personal') return name;
    return `${name} · ${this.t('accounts_type_shared')}`;
  }
}
