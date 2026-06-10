import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Inject } from '@angular/core';
import { ApiService, type Income } from '../core/api.service';
import { I18nService } from '../core/i18n.service';
import { OnboardingService } from '../core/onboarding.service';
import { PeriodStateService } from '../core/period-state.service';
import { EmptyStateComponent } from '../shared/components/empty-state.component';
import { FeedbackBannerComponent } from '../shared/components/feedback-banner.component';
import { PageHeaderComponent } from '../shared/components/page-header.component';

@Component({
  selector: 'app-incomes',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    ReactiveFormsModule,
    EmptyStateComponent,
    FeedbackBannerComponent,
    PageHeaderComponent
  ],
  template: `
    <app-page-header [title]="t('incomes_title')" [eyebrow]="t('incomes_subtitle')"></app-page-header>

    <mat-card id="incomes-toolbar" class="page-panel mb-4 p-4">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="month"
          class="min-h-11 rounded border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-ink"
          [value]="selectedMonth()"
          (change)="changeMonth($event)"
        >
        <div class="flex items-center gap-2">
          <button id="incomes-filter-toggle" mat-stroked-button type="button" (click)="toggleFilters()">
            <mat-icon>tune</mat-icon>
            {{ t('expenses_filters_more') }}
          </button>
          <button id="incomes-new-button" mat-flat-button color="primary" type="button" (click)="openNewIncomeDialog()">
            <mat-icon>add</mat-icon>
            {{ t('incomes_new') }}
          </button>
        </div>
      </div>
      @if (filtersOpen()) {
        <form [formGroup]="filters" (ngSubmit)="loadIncomes()" class="mt-4 grid gap-4 lg:grid-cols-5">
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
      }
    </mat-card>

    <mat-card id="incomes-history-panel" class="page-panel p-5">
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
                <th class="py-2.5 pr-3 text-right font-medium">{{ t('expenses_actions') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (income of incomes(); track income.id) {
                <tr class="border-b border-brand-border/60 last:border-0">
                  <td [attr.data-label]="t('expenses_date')" class="py-3 pl-3 pr-3 text-sm text-brand-muted">{{ formatDate(income.date) }}</td>
                  <td [attr.data-label]="t('expenses_concept')" class="py-3 pr-3 font-medium">{{ income.concept }}</td>
                  <td [attr.data-label]="t('expenses_amount')" class="py-3 pr-3 text-right font-semibold text-emerald-700">{{ formatMoney(income.currency, income.amount) }}</td>
                  <td [attr.data-label]="t('expenses_actions')" class="py-3 pr-3 text-right">
                    <button mat-stroked-button type="button" (click)="openEditIncomeDialog(income)">
                      <mat-icon>edit</mat-icon>
                      {{ t('common_edit') }}
                    </button>
                  </td>
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
export class IncomesComponent implements OnInit {
  private readonly i18n = inject(I18nService);
  private readonly onboarding = inject(OnboardingService);
  private readonly periodState = inject(PeriodStateService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  readonly t = (key: string) => this.i18n.t(key);
  readonly incomes = signal<Income[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly filtersOpen = signal(false);
  readonly selectedMonth = signal(this.periodState.selectedMonth());
  readonly filters = inject(FormBuilder).nonNullable.group({
    from: [''],
    to: [''],
    currency: ['']
  });
  readonly range = computed(() => rangeFromMonth(this.selectedMonth()));

  constructor(private readonly api: ApiService) {}

  ngOnInit() {
    const monthRange = this.range();
    this.filters.patchValue({ from: monthRange.fromInput, to: monthRange.toInput });
    this.loadIncomes();
  }

  changeMonth(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    if (!value || value === this.selectedMonth()) return;
    this.selectedMonth.set(value);
    this.periodState.setSelectedMonth(value);
    const monthRange = rangeFromMonth(value);
    this.filters.patchValue({ from: monthRange.fromInput, to: monthRange.toInput });
    this.loadIncomes();
  }

  toggleFilters() {
    this.filtersOpen.set(!this.filtersOpen());
  }

  openNewIncomeDialog() {
    const ref = this.dialog.open(IncomeCreateDialogComponent, {
      width: 'min(720px, calc(100vw - 1.5rem))',
      maxWidth: 'calc(100vw - 1.5rem)',
      panelClass: 'brand-dialog-panel',
      autoFocus: false
    });
    ref.afterClosed().subscribe((saved: boolean) => {
      if (saved) {
        this.snackBar.open(this.t('incomes_saved'), undefined, { duration: 2400 });
        this.loadIncomes();
      }
    });
  }

  openEditIncomeDialog(income: Income) {
    const ref = this.dialog.open(IncomeCreateDialogComponent, {
      width: 'min(720px, calc(100vw - 1.5rem))',
      maxWidth: 'calc(100vw - 1.5rem)',
      panelClass: 'brand-dialog-panel',
      autoFocus: false,
      data: { income }
    });
    ref.afterClosed().subscribe((saved: boolean) => {
      if (saved) {
        this.snackBar.open(this.t('incomes_updated'), undefined, { duration: 2400 });
        this.loadIncomes();
      }
    });
  }

  loadIncomes() {
    this.loading.set(true);
    this.error.set('');
    const f = this.filters.getRawValue();
    this.api.incomes({
      from: f.from ? startOfDay(f.from) : undefined,
      to: f.to ? endOfDay(f.to) : undefined,
      currency: f.currency ? f.currency.toUpperCase() : undefined,
      limit: 100
    }).subscribe({
      next: (incomes) => {
        this.incomes.set(incomes);
        this.loading.set(false);
        setTimeout(() => this.startOnboarding(), 50);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(this.t('incomes_load_error'));
      }
    });
  }

  clearFilters() {
    const monthRange = this.range();
    this.filters.reset({ from: monthRange.fromInput, to: monthRange.toInput, currency: '' });
    this.loadIncomes();
  }

  totalLabel() {
    const totals = this.incomes().reduce<Record<string, number>>((grouped, income) => {
      grouped[income.currency] = (grouped[income.currency] ?? 0) + Number(income.amount);
      return grouped;
    }, {});
    const entries = Object.entries(totals);
    if (!entries.length) return this.t('dashboard_no_movement');
    return entries.sort(([l], [r]) => l.localeCompare(r)).map(([currency, amount]) => this.formatMoney(currency, amount)).join(' | ');
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

  private startOnboarding() {
    void this.onboarding.startOnce('incomes', [
      {
        element: '#incomes-toolbar',
        title: this.t('onboarding_incomes_title'),
        description: this.t('onboarding_incomes_desc')
      },
      {
        element: '#incomes-filter-toggle',
        title: this.t('onboarding_incomes_filters_title'),
        description: this.t('onboarding_incomes_filters_desc')
      },
      {
        element: '#incomes-new-button',
        title: this.t('onboarding_incomes_new_title'),
        description: this.t('onboarding_incomes_new_desc')
      },
      {
        element: '#incomes-history-panel',
        title: this.t('onboarding_incomes_history_title'),
        description: this.t('onboarding_incomes_history_desc')
      }
    ]);
  }
}

@Component({
  selector: 'app-income-create-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <div class="brand-dialog-shell">
      <div class="brand-dialog-header">
        <h2 class="m-0 text-2xl font-semibold text-brand-ink">{{ income() ? t('common_edit') : t('incomes_new') }}</h2>
      </div>
      <form [formGroup]="form" (ngSubmit)="save()" class="grid gap-4 lg:grid-cols-2">
        <mat-form-field appearance="outline"><mat-label>{{ t('expenses_concept') }}</mat-label><input matInput formControlName="concept"></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>{{ t('expenses_amount') }}</mat-label><input matInput type="number" formControlName="amount"></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>{{ t('expenses_currency') }}</mat-label><input matInput maxlength="3" formControlName="currency"></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>{{ t('expenses_date') }}</mat-label><input matInput type="date" formControlName="date"></mat-form-field>
        <div class="brand-dialog-actions flex flex-col-reverse gap-2 sm:flex-row sm:justify-end lg:col-span-2">
          <button mat-button type="button" (click)="dialogRef.close(false)">{{ t('common_cancel') }}</button>
          <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving()">{{ saving() ? t('incomes_saving') : income() ? t('common_update') : t('incomes_save') }}</button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      color: var(--brand-ink);
    }

    .brand-dialog-shell {
      display: flex;
      max-height: calc(100vh - 3rem);
      flex-direction: column;
      gap: 1rem;
      overflow: auto;
      padding: 1.25rem;
    }

    .brand-dialog-actions {
      padding-top: 0.25rem;
    }

    @media (max-width: 767px) {
      .brand-dialog-shell {
        max-height: calc(100vh - 1.5rem);
        padding: 1rem;
      }

      .brand-dialog-actions {
        position: sticky;
        bottom: 0;
        margin-top: 0.25rem;
        padding-top: 0.75rem;
        background: var(--brand-surface);
      }
    }
  `]
})
export class IncomeCreateDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly i18n = inject(I18nService);
  readonly t = (key: string) => this.i18n.t(key);
  readonly saving = signal(false);
  readonly form = this.fb.nonNullable.group({
    concept: [this.t('incomes_default_concept'), Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    currency: ['CLP', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
    date: [toDateInputValue(new Date()), Validators.required]
  });

  readonly income = signal<Income | null>(null);

  constructor(
    readonly dialogRef: MatDialogRef<IncomeCreateDialogComponent>,
    @Inject(MAT_DIALOG_DATA) data: { income?: Income } | null
  ) {
    const existingIncome = data?.income ?? null;
    this.income.set(existingIncome);
    if (existingIncome) {
      this.form.patchValue({
        concept: existingIncome.concept,
        amount: existingIncome.amount,
        currency: existingIncome.currency,
        date: toDateInputValue(new Date(existingIncome.date))
      });
    }
  }

  save() {
    const value = this.form.getRawValue();
    this.saving.set(true);
    const payload = {
      concept: value.concept,
      amount: Number(value.amount),
      currency: value.currency.toUpperCase(),
      date: startOfDay(value.date)
    };
    const request = this.income()
      ? this.api.updateIncome(this.income()!.id, payload)
      : this.api.createIncome(payload);
    request.subscribe({
      next: () => this.dialogRef.close(true),
      error: () => this.saving.set(false)
    });
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
function rangeFromMonth(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  const fromInput = `${year}-${String(monthNumber).padStart(2, '0')}-01`;
  const toDate = new Date(Date.UTC(year, monthNumber, 0));
  const toInput = `${toDate.getUTCFullYear()}-${String(toDate.getUTCMonth() + 1).padStart(2, '0')}-${String(toDate.getUTCDate()).padStart(2, '0')}`;
  return { fromInput, toInput };
}
