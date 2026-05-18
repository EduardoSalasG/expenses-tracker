import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';

const links = [
  ['dashboard', 'Dashboard', 'Home', 'dashboard'],
  ['expenses', 'Expenses', 'Spend', 'receipt_long'],
  ['incomes', 'Incomes', 'Income', 'payments'],
  ['budgets', 'Budgets', 'Budget', 'account_balance_wallet'],
  ['categories', 'Categories', 'Cats', 'category'],
  ['settings', 'Settings', 'Prefs', 'settings']
] as const;

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatButtonModule, MatIconModule, MatToolbarModule],
  template: `
    <mat-toolbar class="fixed left-0 right-0 top-0 z-30 !h-16 !min-h-16 border-b border-brand-border !bg-brand-surface !text-brand-ink">
      <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-brand-navy text-sm font-semibold text-white">ET</div>
      <span class="ml-3 truncate font-semibold">Expenses Tracker</span>
    </mat-toolbar>
    <div class="app-surface grid min-h-screen pt-16 md:grid-cols-[260px_1fr]">
      <nav class="fixed bottom-0 left-0 right-0 z-20 flex border-t border-brand-border bg-brand-surface/95 p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgb(7_11_18_/_0.10)] md:sticky md:top-16 md:block md:h-[calc(100vh-64px)] md:self-start md:overflow-y-auto md:border-r md:border-t-0 md:bg-brand-surface/90 md:p-3 md:shadow-none">
        @for (link of links; track link[0]) {
          <a
            mat-button
            [routerLink]="link[0]"
            [attr.aria-label]="link[1]"
            routerLinkActive="!bg-brand-navy/10 !text-brand-navy"
            class="!h-12 !min-w-0 !flex-1 !flex-col !px-1 !text-brand-muted md:!h-11 md:!w-full md:!flex-row md:!justify-start md:!px-4"
          >
            <mat-icon>{{ link[3] }}</mat-icon>
            <span class="mt-0.5 text-[11px] leading-none md:hidden">{{ link[2] }}</span>
            <span class="hidden md:ml-2 md:inline md:text-sm">{{ link[1] }}</span>
          </a>
        }
      </nav>
      <section class="min-w-0 px-3 pb-28 pt-4 sm:px-4 md:p-8">
        <router-outlet />
      </section>
    </div>
  `
})
export class ShellComponent {
  readonly links = links;
}
