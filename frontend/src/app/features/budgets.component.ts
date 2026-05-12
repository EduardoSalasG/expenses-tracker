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
    <app-page-header title="Monthly budgets" eyebrow="Plan category limits and track the month">
      <div class="flex items-center gap-2">
        <mat-form-field appearance="outline" class="w-44">
          <mat-label>Month</mat-label>
          <input matInput type="month" [value]="selectedMonth()" (change)="changeMonth($event)">
        </mat-form-field>
      </div>
    </app-page-header>

    <section class="grid gap-4 lg:grid-cols-3">
      <mat-card class="page-panel p-5">
        <div class="text-sm font-medium text-slate-500">Budgeted</div>
        <div class="mt-2 text-3xl font-semibold text-slate-950">{{ totalBudgetedLabel() }}</div>
      </mat-card>
      <mat-card class="page-panel p-5">
        <div class="text-sm font-medium text-slate-500">Spent</div>
        <div class="mt-2 text-3xl font-semibold text-slate-950">{{ totalSpentLabel() }}</div>
      </mat-card>
      <mat-card class="page-panel p-5">
        <div class="text-sm font-medium text-slate-500">Remaining</div>
        <div class="mt-2 text-3xl font-semibold text-slate-950">{{ totalRemainingLabel() }}</div>
      </mat-card>
    </section>

    <mat-card class="page-panel mt-4 p-2">
      <mat-accordion>
        <mat-expansion-panel [expanded]="!!editingBudgetId()">
          <mat-expansion-panel-header>
            <mat-panel-title>{{ editingBudgetId() ? 'Update budget' : 'Create budget' }}</mat-panel-title>
          </mat-expansion-panel-header>
      <form [formGroup]="form" (ngSubmit)="save()" class="grid gap-4 p-3 lg:grid-cols-5">
        <mat-form-field appearance="outline">
          <mat-label>Category</mat-label>
          <mat-select formControlName="categoryId">
            @for (category of rootCategories(); track category.id) {
              <mat-option [value]="category.id">{{ category.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Subcategory</mat-label>
          <mat-select formControlName="subcategoryId">
            <mat-option value="">Whole category</mat-option>
            @for (category of subcategoriesForForm(); track category.id) {
              <mat-option [value]="category.id">{{ category.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Amount</mat-label>
          <input matInput type="number" formControlName="amount">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Currency</mat-label>
          <input matInput maxlength="3" formControlName="currency">
        </mat-form-field>
        <div class="flex items-center gap-2">
          <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving()">
            {{ saving() ? 'Saving...' : editingBudgetId() ? 'Update' : 'Save' }}
          </button>
          @if (editingBudgetId()) {
            <button mat-button type="button" (click)="cancelEdit()">Cancel</button>
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
        <h2 class="text-lg font-semibold">Budget progress</h2>
        <span class="text-sm text-slate-500">{{ budgetRows().length }} active budgets</span>
      </div>
      <app-feedback-banner [message]="error()" tone="error" />
      <app-feedback-banner [message]="loading() ? 'Loading budgets...' : ''" tone="info" />

      @if (budgetRows().length) {
        <div class="grid gap-5">
          @for (row of budgetRows(); track row.budget.id) {
            <div class="rounded border border-slate-200 p-4">
              <div class="mb-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                <div class="min-w-0">
                  <div class="font-medium">{{ row.label }}</div>
                  <div class="mt-1 text-sm text-slate-500">
                    {{ formatMoney(row.budget.currency, row.spent) }} spent of {{ formatMoney(row.budget.currency, row.budget.amount) }}
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <span class="whitespace-nowrap text-sm font-medium">{{ formatMoney(row.budget.currency, row.remaining) }} left</span>
                  <button mat-button type="button" (click)="edit(row.budget)">Edit</button>
                </div>
              </div>
              <mat-progress-bar mode="determinate" [value]="row.progress" />
              <div class="mt-1 text-xs text-slate-500">{{ row.progress }}% used</div>
            </div>
          }
        </div>
      } @else {
        <app-empty-state message="No budgets configured for this month." />
      }
    </mat-card>
  `
})
export class BudgetsComponent {
  private readonly fb = inject(FormBuilder);
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
  readonly subcategoriesForForm = computed(() =>
    this.categories().filter((category) => category.parentId === this.form.controls.categoryId.value)
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
    this.form.controls.categoryId.valueChanges.subscribe(() => this.form.controls.subcategoryId.setValue(''));
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
      budgets: this.api.monthlyBudgets(this.selectedMonth()),
      report: this.api.report(from, to)
    }).subscribe({
      next: ({ categories, budgets, report }) => {
        this.categories.set(categories);
        this.budgets.set(budgets);
        this.report.set(report);
        const firstRoot = categories.find((category) => !category.parentId);
        if (firstRoot && !this.form.controls.categoryId.value) {
          this.form.controls.categoryId.setValue(firstRoot.id);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Could not load budgets.');
      }
    });
  }

  save() {
    const value = this.form.getRawValue();
    this.saving.set(true);
    this.saveMessage.set('');
    this.api.upsertMonthlyBudget({
      month: this.selectedMonth(),
      categoryId: value.categoryId,
      subcategoryId: value.subcategoryId || undefined,
      amount: Number(value.amount),
      currency: value.currency.toUpperCase()
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.saveMessage.set(this.editingBudgetId() ? 'Budget updated.' : 'Budget saved.');
        this.cancelEdit();
        this.loadMonth();
      },
      error: () => {
        this.saving.set(false);
        this.saveMessage.set('Could not save budget.');
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
    if (currency.toUpperCase() === 'CLP') return `$${Number(amount).toLocaleString('es-CL', { maximumFractionDigits: 0 })}`;
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency }).format(Number(amount));
  }

  private buildBudgetRows(): BudgetRow[] {
    const expenses = this.report()?.expenses ?? [];
    return this.budgets().map((budget) => {
      const spent = expenses
        .filter((expense) =>
          expense.currency === budget.currency &&
          expense.categoryId === budget.categoryId &&
          (!budget.subcategoryId || expense.subcategoryId === budget.subcategoryId)
        )
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

  private categoryLabel(categoryId: string): string {
    const category = this.categories().find((item) => item.id === categoryId);
    if (!category) return 'Uncategorized';
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
    if (!entries.length) return 'No budget';
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
