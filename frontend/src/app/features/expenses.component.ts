import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ApiService, type Category, type Expense } from '../core/api.service';

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <div class="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
      <div>
        <p class="text-sm font-medium uppercase tracking-wide text-slate-500">Manual capture and history</p>
        <h1 class="mt-1 text-3xl font-semibold text-slate-950">Expenses</h1>
      </div>
      <button mat-stroked-button type="button" (click)="loadExpenses()">Refresh</button>
    </div>

    <mat-card class="page-panel p-5">
      <h2 class="mb-4 text-lg font-semibold text-slate-950">New expense</h2>
      <form [formGroup]="form" (ngSubmit)="save()" class="grid gap-4 lg:grid-cols-4">
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
          <input matInput formControlName="currency" maxlength="3">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Date</mat-label>
          <input matInput type="date" formControlName="date">
        </mat-form-field>

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
            <mat-option value="">None</mat-option>
            @for (category of subcategoriesForForm(); track category.id) {
              <mat-option [value]="category.id">{{ category.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Payment method</mat-label>
          <mat-select formControlName="paymentKind">
            <mat-option value="cash">Cash</mat-option>
            <mat-option value="card">Card</mat-option>
          </mat-select>
        </mat-form-field>
        @if (form.controls.paymentKind.value === 'card') {
          <mat-form-field appearance="outline">
            <mat-label>Bank</mat-label>
            <input matInput formControlName="bank">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Card type</mat-label>
            <mat-select formControlName="cardType">
              <mat-option value="debit">Debit</mat-option>
              <mat-option value="credit">Credit</mat-option>
            </mat-select>
          </mat-form-field>
        }

        <div class="flex items-center gap-3 lg:col-span-4">
          <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving()">
            {{ saving() ? 'Saving...' : 'Save expense' }}
          </button>
          @if (saveMessage()) {
            <span class="text-sm text-slate-600">{{ saveMessage() }}</span>
          }
        </div>
      </form>
    </mat-card>

    <mat-card class="page-panel mt-4 p-5">
      <h2 class="mb-4 text-lg font-semibold text-slate-950">Filters</h2>
      <form [formGroup]="filters" (ngSubmit)="loadExpenses()" class="grid gap-4 lg:grid-cols-6">
        <mat-form-field appearance="outline">
          <mat-label>From</mat-label>
          <input matInput type="date" formControlName="from">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>To</mat-label>
          <input matInput type="date" formControlName="to">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Category</mat-label>
          <mat-select formControlName="categoryId">
            <mat-option value="">All</mat-option>
            @for (category of categories(); track category.id) {
              <mat-option [value]="category.id">{{ categoryLabel(category) }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Currency</mat-label>
          <input matInput formControlName="currency" maxlength="3">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Payment</mat-label>
          <mat-select formControlName="paymentMethodKind">
            <mat-option value="">All</mat-option>
            <mat-option value="cash">Cash</mat-option>
            <mat-option value="card">Card</mat-option>
          </mat-select>
        </mat-form-field>
        <div class="flex items-center gap-2">
          <button mat-flat-button color="primary" type="submit">Apply</button>
          <button mat-button type="button" (click)="clearFilters()">Clear</button>
        </div>
      </form>
    </mat-card>

    <mat-card class="page-panel mt-4 p-5">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-lg font-semibold">Expense history</h2>
        <span class="text-sm text-slate-500">{{ expenses().length }} records</span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[860px] border-collapse text-left">
          <thead>
            <tr class="border-b border-slate-200 bg-slate-50 text-sm text-slate-500">
              <th class="py-2.5 pl-3 pr-3 font-medium">Date</th>
              <th class="py-2.5 pr-3 font-medium">Concept</th>
              <th class="py-2.5 pr-3 font-medium">Category</th>
              <th class="py-2.5 pr-3 font-medium">Payment</th>
              <th class="py-2.5 pr-3 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            @for (expense of expenses(); track expense.id) {
              <tr class="border-b border-slate-100 last:border-0">
                <td class="py-3 pl-3 pr-3 text-sm text-slate-500">{{ formatDate(expense.date) }}</td>
                <td class="py-3 pr-3 font-medium">{{ expense.concept }}</td>
                <td class="py-3 pr-3 text-sm">{{ categoryName(expense.subcategoryId ?? expense.categoryId) }}</td>
                <td class="py-3 pr-3 text-sm text-slate-600">{{ paymentLabel(expense) }}</td>
                <td class="py-3 pr-3 text-right font-semibold">{{ formatMoney(expense.currency, expense.amount) }}</td>
              </tr>
            } @empty {
              <tr>
                <td class="py-6 text-slate-500" colspan="5">No expenses match the selected filters.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </mat-card>
  `
})
export class ExpensesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly categories = signal<Category[]>([]);
  readonly expenses = signal<Expense[]>([]);
  readonly saving = signal(false);
  readonly saveMessage = signal('');
  readonly rootCategories = computed(() => this.categories().filter((category) => !category.parentId));
  readonly subcategoriesForForm = computed(() =>
    this.categories().filter((category) => category.parentId === this.form.controls.categoryId.value)
  );
  readonly form = this.fb.nonNullable.group({
    concept: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    currency: ['CLP', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
    date: [toDateInputValue(new Date()), Validators.required],
    categoryId: ['', Validators.required],
    subcategoryId: [''],
    paymentKind: ['cash'],
    bank: [''],
    cardType: ['debit']
  });
  readonly filters = this.fb.nonNullable.group({
    from: [''],
    to: [''],
    categoryId: [''],
    currency: [''],
    paymentMethodKind: ['']
  });

  constructor(private readonly api: ApiService) {}

  ngOnInit() {
    this.api.categories().subscribe((categories) => {
      this.categories.set(categories);
      const firstRoot = categories.find((category) => !category.parentId);
      if (firstRoot && !this.form.controls.categoryId.value) {
        this.form.controls.categoryId.setValue(firstRoot.id);
      }
    });
    this.form.controls.categoryId.valueChanges.subscribe(() => this.form.controls.subcategoryId.setValue(''));
    this.loadExpenses();
  }

  loadExpenses() {
    const filters = this.filters.getRawValue();
    this.api.expenses({
      from: filters.from ? startOfDay(filters.from) : undefined,
      to: filters.to ? endOfDay(filters.to) : undefined,
      categoryId: filters.categoryId || undefined,
      currency: filters.currency ? filters.currency.toUpperCase() : undefined,
      paymentMethodKind: filters.paymentMethodKind ? filters.paymentMethodKind as 'cash' | 'card' : undefined,
      limit: 100
    }).subscribe((expenses) => this.expenses.set(expenses));
  }

  clearFilters() {
    this.filters.reset({ from: '', to: '', categoryId: '', currency: '', paymentMethodKind: '' });
    this.loadExpenses();
  }

  save() {
    const value = this.form.getRawValue();
    this.saving.set(true);
    this.saveMessage.set('');
    this.api.createExpense({
      date: startOfDay(value.date),
      amount: Number(value.amount),
      currency: value.currency.toUpperCase(),
      concept: value.concept,
      categoryId: value.categoryId,
      subcategoryId: value.subcategoryId || undefined,
      paymentMethod: value.paymentKind === 'card'
        ? { kind: 'card', bank: value.bank || undefined, cardType: value.cardType as 'credit' | 'debit' }
        : { kind: 'cash' }
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.saveMessage.set('Expense saved.');
        this.form.patchValue({ concept: '', amount: 0, subcategoryId: '', bank: '' });
        this.loadExpenses();
      },
      error: () => {
        this.saving.set(false);
        this.saveMessage.set('Could not save expense.');
      }
    });
  }

  categoryName(categoryId: string) {
    return this.categories().find((category) => category.id === categoryId)?.name ?? 'Uncategorized';
  }

  categoryLabel(category: Category) {
    if (!category.parentId) return category.name;
    return `${this.categoryName(category.parentId)} / ${category.name}`;
  }

  paymentLabel(expense: Expense) {
    if (expense.paymentMethod.kind === 'cash') return 'Cash';
    const cardType = expense.paymentMethod.cardType ? `${expense.paymentMethod.cardType} card` : 'Card';
    return expense.paymentMethod.bank ? `${expense.paymentMethod.bank} ${cardType}` : cardType;
  }

  formatDate(value: string) {
    return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
  }

  formatMoney(currency: string, amount: number) {
    return `${currency} ${Number(amount).toLocaleString('en', { maximumFractionDigits: 0 })}`;
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
