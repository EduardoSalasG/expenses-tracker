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
    <mat-toolbar class="sticky top-0 z-10 border-b border-slate-200 !bg-white !text-slate-950">
      <div class="flex h-9 w-9 items-center justify-center rounded bg-slate-950 text-sm font-semibold text-white">ET</div>
      <span class="ml-3 font-semibold">Expenses Tracker</span>
      <span class="flex-1"></span>
      <button mat-stroked-button type="button" (click)="logout()">
        <mat-icon>logout</mat-icon>
        <span class="ml-1">Logout</span>
      </button>
    </mat-toolbar>
    <div class="app-surface min-h-[calc(100vh-64px)] grid md:grid-cols-[260px_1fr]">
      <nav class="border-r border-slate-200 bg-white/90 p-3 flex md:block overflow-x-auto">
        @for (link of links; track link[0]) {
          <a
            mat-button
            [routerLink]="link[0]"
            routerLinkActive="!bg-slate-100 !text-slate-950"
            class="!h-11 md:!w-full md:!justify-start !text-slate-600"
          >
            <mat-icon>{{ link[2] }}</mat-icon>
            <span class="ml-2">{{ link[1] }}</span>
          </a>
        }
      </nav>
      <section class="min-w-0 p-4 md:p-8">
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
