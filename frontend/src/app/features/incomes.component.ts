import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatExpansionModule } from '@angular/material/expansion';
import { ApiService, type Income } from '../core/api.service';
import { I18nService } from '../core/i18n.service';
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
    <app-page-header [title]="t('incomes_title')" [eyebrow]="t('incomes_subtitle')"></app-page-header>

    <mat-card class="page-panel p-2">
      <mat-accordion>
        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title>{{ t('incomes_new') }}</mat-panel-title>
          </mat-expansion-panel-header>
      <form [formGroup]="form" (ngSubmit)="save()" class="grid gap-4 p-3 lg:grid-cols-4">
        <mat-form-field appearance="outline">
          <mat-label>{{ t('expenses_concept') }}</mat-label>
          <input matInput formControlName="concept">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ t('expenses_amount') }}</mat-label>
          <input matInput type="number" formControlName="amount">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ t('expenses_currency') }}</mat-label>
          <input matInput maxlength="3" formControlName="currency">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ t('expenses_date') }}</mat-label>
          <input matInput type="date" formControlName="date">
        </mat-form-field>

        <div class="mobile-stack-actions flex flex-col gap-3 sm:flex-row sm:items-center lg:col-span-4">
          <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving()">
            {{ saving() ? t('incomes_saving') : t('incomes_save') }}
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
            <mat-panel-title>{{ t('incomes_filters') }}</mat-panel-title>
          </mat-expansion-panel-header>
      <form [formGroup]="filters" (ngSubmit)="loadIncomes()" class="grid gap-4 p-3 lg:grid-cols-5">
        <mat-form-field appearance="outline">
          <mat-label>{{ t('expenses_from') }}</mat-label>
          <input matInput type="date" formControlName="from">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ t('expenses_to') }}</mat-label>
          <input matInput type="date" formControlName="to">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ t('expenses_currency') }}</mat-label>
          <input matInput formControlName="currency" maxlength="3">
        </mat-form-field>
        <div class="mobile-stack-actions flex flex-col gap-2 sm:flex-row sm:items-center lg:col-span-2">
          <button mat-flat-button color="primary" type="submit">{{ t('expenses_apply') }}</button>
          <button mat-button type="button" (click)="clearFilters()">{{ t('expenses_clear') }}</button>
        </div>
      </form>
        </mat-expansion-panel>
      </mat-accordion>
    </mat-card>

    <mat-card class="page-panel mt-4 p-5">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-lg font-semibold">{{ t('incomes_history') }}</h2>
        <span class="text-sm text-brand-muted">{{ totalLabel() }} {{ t('incomes_total_across') }} {{ incomes().length }} {{ t('expenses_records') }}</span>
      </div>
      <app-feedback-banner [message]="error()" tone="error" />
      <app-feedback-banner [message]="loading() ? t('incomes_loading') : ''" tone="info" />

      @if (incomes().length) {
        <div class="responsive-table-wrapper overflow-x-auto">
          <table class="responsive-table w-full min-w-[560px] border-collapse text-left">
            <thead>
              <tr class="border-b border-brand-border bg-brand-surface-muted text-sm text-brand-muted">
                <th class="py-2.5 pl-3 pr-3 font-medium">{{ t('expenses_date') }}</th>
                <th class="py-2.5 pr-3 font-medium">{{ t('expenses_concept') }}</th>
                <th class="py-2.5 pr-3 text-right font-medium">{{ t('expenses_amount') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (income of incomes(); track income.id) {
                <tr class="border-b border-brand-border/60 last:border-0">
                  <td [attr.data-label]="t('expenses_date')" class="py-3 pl-3 pr-3 text-sm text-brand-muted">{{ formatDate(income.date) }}</td>
                  <td [attr.data-label]="t('expenses_concept')" class="py-3 pr-3 font-medium">{{ income.concept }}</td>
                  <td [attr.data-label]="t('expenses_amount')" class="py-3 pr-3 text-right font-semibold text-emerald-700">{{ formatMoney(income.currency, income.amount) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <app-empty-state [message]="t('incomes_empty_filters')" />
      }
    </mat-card>
  `
})
export class IncomesComponent {
  private readonly fb = inject(FormBuilder);
  private readonly i18n = inject(I18nService);
  readonly t = (key: string) => this.i18n.t(key);
  readonly incomes = signal<Income[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly saving = signal(false);
  readonly saveMessage = signal('');
  readonly form = this.fb.nonNullable.group({
    concept: [this.t('incomes_default_concept'), Validators.required],
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
        this.error.set(this.t('incomes_load_error'));
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
        this.saveMessage.set(this.t('incomes_saved'));
        this.form.patchValue({ concept: '', amount: 0 });
        this.loadIncomes();
      },
      error: () => {
        this.saving.set(false);
        this.saveMessage.set(this.t('incomes_save_error'));
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
    const locale = this.i18n.language() === 'es' ? 'es-CL' : 'en-US';
    return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
  }

  formatMoney(currency: string, amount: number) {
    const locale = this.i18n.language() === 'es' ? 'es-CL' : 'en-US';
    if (currency.toUpperCase() === 'CLP') return `$${Number(amount).toLocaleString(locale, { maximumFractionDigits: 0 })}`;
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(Number(amount));
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
