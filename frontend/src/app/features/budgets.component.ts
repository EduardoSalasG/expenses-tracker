import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatExpansionModule } from '@angular/material/expansion';
import { forkJoin } from 'rxjs';
import { ApiService, type Category, type MonthlyBudget, type Report } from '../core/api.service';
import { I18nService } from '../core/i18n.service';
import { EmptyStateComponent } from '../shared/components/empty-state.component';
import { FeedbackBannerComponent } from '../shared/components/feedback-banner.component';
import { PageHeaderComponent } from '../shared/components/page-header.component';

interface BudgetRow {
  budget: MonthlyBudget;
  label: string;
  spent: number;
  remaining: number;
  progress: number;
}

@Component({
  selector: 'app-budgets',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
    MatExpansionModule,
    EmptyStateComponent,
    FeedbackBannerComponent,
    PageHeaderComponent
  ],
  template: `
    <app-page-header [title]="t('budgets_title')" [eyebrow]="t('budgets_subtitle')">
      <div class="w-full sm:w-auto">
        <mat-form-field appearance="outline" class="w-full sm:w-44">
          <mat-label>{{ t('budgets_month') }}</mat-label>
          <input matInput type="month" [value]="selectedMonth()" (change)="changeMonth($event)">
        </mat-form-field>
      </div>
    </app-page-header>

    <section class="grid gap-4 lg:grid-cols-3">
      <mat-card class="page-panel p-5">
        <div class="text-sm font-medium text-brand-muted">{{ t('budgets_budgeted') }}</div>
        <div class="mt-2 text-2xl font-semibold text-brand-ink sm:text-3xl">{{ totalBudgetedLabel() }}</div>
      </mat-card>
      <mat-card class="page-panel p-5">
        <div class="text-sm font-medium text-brand-muted">{{ t('budgets_spent') }}</div>
        <div class="mt-2 text-2xl font-semibold text-brand-ink sm:text-3xl">{{ totalSpentLabel() }}</div>
      </mat-card>
      <mat-card class="page-panel p-5">
        <div class="text-sm font-medium text-brand-muted">{{ t('budgets_remaining') }}</div>
        <div class="mt-2 text-2xl font-semibold text-brand-ink sm:text-3xl">{{ totalRemainingLabel() }}</div>
      </mat-card>
    </section>

    <mat-card class="page-panel mt-4 p-2">
      <mat-accordion>
        <mat-expansion-panel [expanded]="!!editingBudgetId()">
          <mat-expansion-panel-header>
            <mat-panel-title>{{ editingBudgetId() ? t('budgets_update') : t('budgets_create') }}</mat-panel-title>
          </mat-expansion-panel-header>
      <form [formGroup]="form" (ngSubmit)="save()" class="grid gap-4 p-3 lg:grid-cols-5">
        <mat-form-field appearance="outline">
          <mat-label>{{ t('expenses_category') }}</mat-label>
          <mat-select formControlName="categoryId">
            @for (category of rootCategories(); track category.id) {
              <mat-option [value]="category.id">{{ category.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ t('expenses_subcategory') }}</mat-label>
          <mat-select formControlName="subcategoryId">
            <mat-option [value]="''">{{ t('budgets_whole_category') }}</mat-option>
            @for (category of subcategoriesForForm(); track category.id) {
              <mat-option [value]="category.id">{{ category.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ t('expenses_amount') }}</mat-label>
          <input matInput type="number" formControlName="amount">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ t('expenses_currency') }}</mat-label>
          <input matInput maxlength="3" formControlName="currency">
        </mat-form-field>
        <div class="mobile-stack-actions flex flex-col gap-2 sm:flex-row sm:items-center">
          <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving()">
            {{ saving() ? t('incomes_saving') : editingBudgetId() ? t('common_update') : t('common_save') }}
          </button>
          @if (editingBudgetId()) {
            <button mat-button type="button" (click)="cancelEdit()">{{ t('common_cancel') }}</button>
          }
        </div>
        <div class="lg:col-span-5">
          <app-feedback-banner [message]="saveMessage()" tone="success" />
        </div>
      </form>
        </mat-expansion-panel>
      </mat-accordion>
    </mat-card>

    <mat-card class="page-panel mt-4 p-5">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-lg font-semibold">{{ t('budgets_progress') }}</h2>
        <span class="text-sm text-brand-muted">{{ budgetRows().length }} {{ t('budgets_active') }}</span>
      </div>
      <app-feedback-banner [message]="error()" tone="error" />
      <app-feedback-banner [message]="loading() ? t('budgets_loading') : ''" tone="info" />

      @if (budgetRows().length) {
        <div class="grid gap-5">
          @for (row of budgetRows(); track row.budget.id) {
            <div class="rounded border border-brand-border p-4">
              <div class="mb-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                <div class="min-w-0">
                  <div class="font-medium">{{ row.label }}</div>
                  <div class="mt-1 text-sm text-brand-muted">
                    {{ formatMoney(row.budget.currency, row.spent) }} {{ t('dashboard_spent_of') }} {{ formatMoney(row.budget.currency, row.budget.amount) }}
                  </div>
                </div>
                <div class="mobile-stack-actions flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <span class="text-sm font-medium sm:whitespace-nowrap">{{ formatMoney(row.budget.currency, row.remaining) }} {{ t('dashboard_left') }}</span>
                  <button mat-button type="button" (click)="edit(row.budget)">{{ t('common_edit') }}</button>
                </div>
              </div>
              <mat-progress-bar mode="determinate" [value]="row.progress" />
              <div class="mt-1 text-xs text-brand-muted">{{ row.progress }}% {{ t('dashboard_used') }}</div>
            </div>
          }
        </div>
      } @else {
        <app-empty-state [message]="t('budgets_no_month')" />
      }
    </mat-card>
  `
})
export class BudgetsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly i18n = inject(I18nService);
  readonly t = (key: string) => this.i18n.t(key);
  readonly selectedMonth = signal(currentMonth());
  readonly categories = signal<Category[]>([]);
  readonly budgets = signal<MonthlyBudget[]>([]);
  readonly report = signal<Report | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly saving = signal(false);
  readonly saveMessage = signal('');
  readonly editingBudgetId = signal<string | null>(null);
  readonly rootCategories = computed(() => this.categories().filter((category) => !category.parentId));
  readonly selectedCategoryId = signal('');
  readonly subcategoriesForForm = computed(() =>
    this.categories().filter((category) => category.parentId === this.selectedCategoryId())
  );
  readonly budgetRows = computed(() => this.buildBudgetRows());
  readonly totalBudgetedLabel = computed(() => this.formatTotalsByCurrency(this.budgets()));
  readonly totalSpentLabel = computed(() => this.formatRowsByCurrency(this.budgetRows(), 'spent'));
  readonly totalRemainingLabel = computed(() => this.formatRowsByCurrency(this.budgetRows(), 'remaining'));
  readonly form = this.fb.nonNullable.group({
    categoryId: ['', Validators.required],
    subcategoryId: [''],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    currency: ['CLP', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]]
  });

  constructor(private readonly api: ApiService) {
    this.selectedCategoryId.set(this.form.controls.categoryId.value);
    this.form.controls.categoryId.valueChanges.subscribe((categoryId) => {
      this.selectedCategoryId.set(categoryId);
      this.form.controls.subcategoryId.setValue('');
    });
    this.loadMonth();
  }

  changeMonth(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    if (!value) return;
    this.selectedMonth.set(value);
    this.cancelEdit();
    this.loadMonth();
  }

  loadMonth() {
    this.loading.set(true);
    this.error.set('');
    const { from, to } = monthRange(this.selectedMonth());
    forkJoin({
      categories: this.api.categories(),
      budgets: this.api.monthlyBudgets(),
      report: this.api.report(from, to)
    }).subscribe({
      next: ({ categories, budgets, report }) => {
        this.categories.set(categories);
        this.budgets.set(budgets);
        this.report.set(report);
        const firstRoot = categories.find((category) => !category.parentId);
        if (firstRoot && !this.form.controls.categoryId.value) {
          this.form.controls.categoryId.setValue(firstRoot.id);
          this.selectedCategoryId.set(firstRoot.id);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(this.t('budgets_load_error'));
      }
    });
  }

  save() {
    const value = this.form.getRawValue();
    this.saving.set(true);
    this.saveMessage.set('');
    this.api.upsertMonthlyBudget({
      categoryId: value.categoryId,
      subcategoryId: value.subcategoryId || undefined,
      amount: Number(value.amount),
      currency: value.currency.toUpperCase()
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.saveMessage.set(this.editingBudgetId() ? this.t('budgets_updated') : this.t('budgets_saved'));
        this.cancelEdit();
        this.loadMonth();
      },
      error: () => {
        this.saving.set(false);
        this.saveMessage.set(this.t('budgets_save_error'));
      }
    });
  }

  edit(budget: MonthlyBudget) {
    this.editingBudgetId.set(budget.id);
    this.form.patchValue({
      categoryId: budget.categoryId,
      subcategoryId: budget.subcategoryId ?? '',
      amount: Number(budget.amount),
      currency: budget.currency
    });
  }

  cancelEdit() {
    this.editingBudgetId.set(null);
    this.form.patchValue({ amount: 0, subcategoryId: '' });
  }

  formatMoney(currency: string, amount: number) {
    const locale = this.i18n.language() === 'es' ? 'es-CL' : 'en-US';
    if (currency.toUpperCase() === 'CLP') return `$${Number(amount).toLocaleString(locale, { maximumFractionDigits: 0 })}`;
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(Number(amount));
  }

  private buildBudgetRows(): BudgetRow[] {
    const expenses = this.report()?.expenses ?? [];
    return this.budgets().map((budget) => {
      const spent = expenses
        .filter((expense) => this.matchesBudget(expense, budget))
        .reduce((total, expense) => total + Number(expense.amount), 0);
      const amount = Number(budget.amount);
      return {
        budget,
        label: this.categoryLabel(budget.subcategoryId ?? budget.categoryId),
        spent,
        remaining: Math.max(amount - spent, 0),
        progress: Math.min(Math.round((spent / amount) * 100), 100)
      };
    });
  }

  private matchesBudget(expense: Report['expenses'][number], budget: MonthlyBudget) {
    if (expense.currency !== budget.currency) return false;

    if (budget.subcategoryId) {
      // Accept both normalized shape (category + subcategory) and legacy/misaligned shape
      // where the subcategory may have been stored directly as category_id.
      return expense.subcategoryId === budget.subcategoryId || expense.categoryId === budget.subcategoryId;
    }

    if (expense.categoryId === budget.categoryId || expense.subcategoryId === budget.categoryId) {
      return true;
    }

    // If expense points to a subcategory as categoryId, include it when parent matches budget category.
    const category = this.categories().find((item) => item.id === expense.categoryId);
    return category?.parentId === budget.categoryId;
  }

  private categoryLabel(categoryId: string): string {
    const category = this.categories().find((item) => item.id === categoryId);
    if (!category) return this.t('expenses_uncategorized');
    if (!category.parentId) return category.name;
    return `${this.categoryLabel(category.parentId)} / ${category.name}`;
  }

  private formatTotalsByCurrency(budgets: MonthlyBudget[]) {
    const totals = budgets.reduce<Record<string, number>>((grouped, budget) => {
      grouped[budget.currency] = (grouped[budget.currency] ?? 0) + Number(budget.amount);
      return grouped;
    }, {});
    return this.formatCurrencyMap(totals);
  }

  private formatRowsByCurrency(rows: BudgetRow[], key: 'spent' | 'remaining') {
    const totals = rows.reduce<Record<string, number>>((grouped, row) => {
      grouped[row.budget.currency] = (grouped[row.budget.currency] ?? 0) + row[key];
      return grouped;
    }, {});
    return this.formatCurrencyMap(totals);
  }

  private formatCurrencyMap(totals: Record<string, number>) {
    const entries = Object.entries(totals);
    if (!entries.length) return this.t('budgets_no_budget');
    return entries
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([currency, amount]) => this.formatMoney(currency, amount))
      .join(' | ');
  }
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function monthRange(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  const from = new Date(Date.UTC(year, monthNumber - 1, 1, 0, 0, 0));
  const to = new Date(Date.UTC(year, monthNumber, 0, 23, 59, 59));
  return { from: from.toISOString(), to: to.toISOString() };
}
