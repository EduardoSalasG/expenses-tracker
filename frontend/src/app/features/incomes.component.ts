import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatExpansionModule } from '@angular/material/expansion';
import { ApiService, type Income } from '../core/api.service';
import { EmptyStateComponent } from '../shared/components/empty-state.component';
import { FeedbackBannerComponent } from '../shared/components/feedback-banner.component';
import { PageHeaderComponent } from '../shared/components/page-header.component';

@Component({
  selector: 'app-incomes',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatExpansionModule,
    EmptyStateComponent,
    FeedbackBannerComponent,
    PageHeaderComponent
  ],
  template: `
    <app-page-header title="Incomes" eyebrow="Capture salary, refunds, and other money in"></app-page-header>

    <mat-card class="page-panel p-2">
      <mat-accordion>
        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title>New income</mat-panel-title>
          </mat-expansion-panel-header>
      <form [formGroup]="form" (ngSubmit)="save()" class="grid gap-4 p-3 lg:grid-cols-4">
        <mat-form-field appearance="outline">
          <mat-label>Concept</mat-label>
          <input matInput formControlName="concept">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Amount</mat-label>
          <input matInput type="number" formControlName="amount">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Currency</mat-label>
          <input matInput maxlength="3" formControlName="currency">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Date</mat-label>
          <input matInput type="date" formControlName="date">
        </mat-form-field>

        <div class="flex items-center gap-3 lg:col-span-4">
          <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving()">
            {{ saving() ? 'Saving...' : 'Save income' }}
          </button>
          <app-feedback-banner [message]="saveMessage()" tone="success" />
        </div>
      </form>
        </mat-expansion-panel>
      </mat-accordion>
    </mat-card>

    <mat-card class="page-panel mt-4 p-2">
      <mat-accordion>
        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title>Filters</mat-panel-title>
          </mat-expansion-panel-header>
      <form [formGroup]="filters" (ngSubmit)="loadIncomes()" class="grid gap-4 p-3 lg:grid-cols-5">
        <mat-form-field appearance="outline">
          <mat-label>From</mat-label>
          <input matInput type="date" formControlName="from">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>To</mat-label>
          <input matInput type="date" formControlName="to">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Currency</mat-label>
          <input matInput formControlName="currency" maxlength="3">
        </mat-form-field>
        <div class="flex items-center gap-2 lg:col-span-2">
          <button mat-flat-button color="primary" type="submit">Apply</button>
          <button mat-button type="button" (click)="clearFilters()">Clear</button>
        </div>
      </form>
        </mat-expansion-panel>
      </mat-accordion>
    </mat-card>

    <mat-card class="page-panel mt-4 p-5">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-lg font-semibold">Income history</h2>
        <span class="text-sm text-slate-500">{{ totalLabel() }} across {{ incomes().length }} records</span>
      </div>
      <app-feedback-banner [message]="error()" tone="error" />
      <app-feedback-banner [message]="loading() ? 'Loading incomes...' : ''" tone="info" />

      @if (incomes().length) {
        <div class="overflow-x-auto">
          <table class="w-full min-w-[560px] border-collapse text-left">
            <thead>
              <tr class="border-b border-slate-200 bg-slate-50 text-sm text-slate-500">
                <th class="py-2.5 pl-3 pr-3 font-medium">Date</th>
                <th class="py-2.5 pr-3 font-medium">Concept</th>
                <th class="py-2.5 pr-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              @for (income of incomes(); track income.id) {
                <tr class="border-b border-slate-100 last:border-0">
                  <td class="py-3 pl-3 pr-3 text-sm text-slate-500">{{ formatDate(income.date) }}</td>
                  <td class="py-3 pr-3 font-medium">{{ income.concept }}</td>
                  <td class="py-3 pr-3 text-right font-semibold text-emerald-700">{{ formatMoney(income.currency, income.amount) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <app-empty-state message="No incomes match the selected filters." />
      }
    </mat-card>
  `
})
export class IncomesComponent {
  private readonly fb = inject(FormBuilder);
  readonly incomes = signal<Income[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly saving = signal(false);
  readonly saveMessage = signal('');
  readonly form = this.fb.nonNullable.group({
    concept: ['Monthly salary', Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    currency: ['CLP', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
    date: [toDateInputValue(new Date()), Validators.required]
  });
  readonly filters = this.fb.nonNullable.group({
    from: [''],
    to: [''],
    currency: ['']
  });

  constructor(private readonly api: ApiService) {
    this.loadIncomes();
  }

  loadIncomes() {
    this.loading.set(true);
    this.error.set('');
    const filters = this.filters.getRawValue();
    this.api.incomes({
      from: filters.from ? startOfDay(filters.from) : undefined,
      to: filters.to ? endOfDay(filters.to) : undefined,
      currency: filters.currency ? filters.currency.toUpperCase() : undefined,
      limit: 100
    }).subscribe({
      next: (incomes) => {
        this.incomes.set(incomes);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Could not load incomes.');
      }
    });
  }

  clearFilters() {
    this.filters.reset({ from: '', to: '', currency: '' });
    this.loadIncomes();
  }

  save() {
    const value = this.form.getRawValue();
    this.saving.set(true);
    this.saveMessage.set('');
    this.api.createIncome({
      concept: value.concept,
      amount: Number(value.amount),
      currency: value.currency.toUpperCase(),
      date: startOfDay(value.date)
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.saveMessage.set('Income saved.');
        this.form.patchValue({ concept: '', amount: 0 });
        this.loadIncomes();
      },
      error: () => {
        this.saving.set(false);
        this.saveMessage.set('Could not save income.');
      }
    });
  }

  totalLabel() {
    const totals = this.incomes().reduce<Record<string, number>>((grouped, income) => {
      grouped[income.currency] = (grouped[income.currency] ?? 0) + Number(income.amount);
      return grouped;
    }, {});
    const entries = Object.entries(totals);
    if (!entries.length) return 'No movement';
    return entries
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([currency, amount]) => this.formatMoney(currency, amount))
      .join(' | ');
  }

  formatDate(value: string) {
    return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
  }

  formatMoney(currency: string, amount: number) {
    if (currency.toUpperCase() === 'CLP') return `$${Number(amount).toLocaleString('es-CL', { maximumFractionDigits: 0 })}`;
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency }).format(Number(amount));
  }
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfDay(date: string) {
  return new Date(`${date}T00:00:00.000`).toISOString();
}

function endOfDay(date: string) {
  return new Date(`${date}T23:59:59.999`).toISOString();
}
