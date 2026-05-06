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
    <mat-toolbar color="primary" class="sticky top-0 z-10">
      <span class="font-semibold">Expenses Tracker</span>
      <span class="flex-1"></span>
      <button mat-button type="button" (click)="logout()">
        <mat-icon>logout</mat-icon>
        <span class="ml-1">Logout</span>
      </button>
    </mat-toolbar>
    <div class="min-h-[calc(100vh-64px)] grid md:grid-cols-[240px_1fr]">
      <nav class="bg-white border-r border-slate-200 p-3 flex md:block overflow-x-auto">
        @for (link of links; track link[0]) {
          <a mat-button [routerLink]="link[0]" routerLinkActive="!bg-slate-100" class="md:w-full md:justify-start">
            <mat-icon>{{ link[2] }}</mat-icon>
            <span class="ml-2">{{ link[1] }}</span>
          </a>
        }
      </nav>
      <section class="p-4 md:p-6">
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
