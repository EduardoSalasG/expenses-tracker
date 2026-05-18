import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthService } from '../core/auth.service';

const links = [
  ['dashboard', 'Dashboard', 'dashboard'],
  ['expenses', 'Expenses', 'receipt_long'],
  ['incomes', 'Incomes', 'payments'],
  ['budgets', 'Budgets', 'account_balance_wallet'],
  ['categories', 'Categories', 'category'],
  ['settings', 'Settings', 'settings']
] as const;

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatButtonModule, MatIconModule, MatToolbarModule],
  template: `
    <mat-toolbar class="sticky top-0 z-20 border-b border-brand-border !bg-brand-surface !text-brand-ink">
      <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-brand-navy text-sm font-semibold text-white">ET</div>
      <span class="ml-3 truncate font-semibold">Expenses Tracker</span>
      <span class="flex-1"></span>
      <button mat-stroked-button type="button" (click)="logout()" class="!min-w-0 shrink-0">
        <mat-icon>logout</mat-icon>
        <span class="ml-1 hidden sm:inline">Logout</span>
      </button>
    </mat-toolbar>
    <div class="app-surface grid min-h-[calc(100vh-64px)] md:grid-cols-[260px_1fr]">
      <nav class="fixed bottom-0 left-0 right-0 z-20 flex border-t border-brand-border bg-brand-surface/95 p-2 shadow-[0_-4px_16px_rgb(7_11_18_/_0.10)] md:static md:block md:border-r md:border-t-0 md:bg-brand-surface/90 md:p-3 md:shadow-none">
        @for (link of links; track link[0]) {
          <a
            mat-button
            [routerLink]="link[0]"
            routerLinkActive="!bg-brand-navy/10 !text-brand-navy"
            class="!h-12 !min-w-0 !flex-1 !px-1 !text-brand-muted md:!h-11 md:!w-full md:!justify-start md:!px-4"
          >
            <mat-icon>{{ link[2] }}</mat-icon>
            <span class="hidden md:ml-2 md:inline">{{ link[1] }}</span>
          </a>
        }
      </nav>
      <section class="min-w-0 px-3 pb-24 pt-4 sm:px-4 md:p-8">
        <router-outlet />
      </section>
    </div>
  `
})
export class ShellComponent {
  readonly links = links;

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router
  ) {}

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
