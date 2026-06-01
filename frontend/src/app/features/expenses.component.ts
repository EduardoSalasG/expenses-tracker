import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatExpansionModule } from '@angular/material/expansion';
import { ApiService, type Category, type Expense } from '../core/api.service';
import { I18nService } from '../core/i18n.service';
import { FeedbackBannerComponent } from '../shared/components/feedback-banner.component';
import { PageHeaderComponent } from '../shared/components/page-header.component';

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatExpansionModule, FeedbackBannerComponent, PageHeaderComponent],
  template: `
    <app-page-header [title]="t('expenses_title')" [eyebrow]="t('expenses_subtitle')"></app-page-header>

    <mat-card class="page-panel p-2">
      <mat-accordion>
        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title>{{ t('expenses_new') }}</mat-panel-title>
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
          <input matInput formControlName="currency" maxlength="3">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ t('expenses_date') }}</mat-label>
          <input matInput type="date" formControlName="date">
        </mat-form-field>

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
            <mat-option [value]="''">{{ t('expenses_none') }}</mat-option>
            @for (category of subcategoriesForForm(); track category.id) {
              <mat-option [value]="category.id">{{ category.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ t('expenses_payment_method') }}</mat-label>
          <mat-select formControlName="paymentKind">
            <mat-option value="cash">{{ t('expenses_cash') }}</mat-option>
            <mat-option value="transfer">{{ t('expenses_transfer') }}</mat-option>
            <mat-option value="card">{{ t('expenses_card') }}</mat-option>
          </mat-select>
        </mat-form-field>
        @if (form.controls.paymentKind.value === 'card' || form.controls.paymentKind.value === 'transfer') {
          <mat-form-field appearance="outline">
            <mat-label>{{ t('expenses_bank') }}</mat-label>
            <input matInput formControlName="bank">
          </mat-form-field>
        }
        @if (form.controls.paymentKind.value === 'card') {
          <mat-form-field appearance="outline">
            <mat-label>{{ t('expenses_card_type') }}</mat-label>
            <mat-select formControlName="cardType">
              <mat-option value="debit">{{ t('expenses_debit') }}</mat-option>
              <mat-option value="credit">{{ t('expenses_credit') }}</mat-option>
            </mat-select>
          </mat-form-field>
        }

        <div class="mobile-stack-actions flex flex-col gap-3 sm:flex-row sm:items-center lg:col-span-4">
          <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving()">
            {{ saving() ? t('expenses_saving') : t('expenses_save') }}
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
            <mat-panel-title>{{ t('expenses_filters') }}</mat-panel-title>
          </mat-expansion-panel-header>
      <form [formGroup]="filters" (ngSubmit)="loadExpenses()" class="grid gap-4 p-3 lg:grid-cols-6">
        <mat-form-field appearance="outline">
          <mat-label>{{ t('expenses_from') }}</mat-label>
          <input matInput type="date" formControlName="from">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ t('expenses_to') }}</mat-label>
          <input matInput type="date" formControlName="to">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ t('expenses_category') }}</mat-label>
          <mat-select formControlName="categoryId">
            <mat-option value="">{{ t('expenses_all') }}</mat-option>
            @for (category of categories(); track category.id) {
              <mat-option [value]="category.id">{{ categoryLabel(category) }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ t('expenses_currency') }}</mat-label>
          <input matInput formControlName="currency" maxlength="3">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ t('expenses_payment_method') }}</mat-label>
          <mat-select formControlName="paymentMethodKind">
            <mat-option value="">{{ t('expenses_all_short') }}</mat-option>
            <mat-option value="cash">{{ t('expenses_cash') }}</mat-option>
            <mat-option value="transfer">{{ t('expenses_transfer') }}</mat-option>
            <mat-option value="card">{{ t('expenses_card') }}</mat-option>
          </mat-select>
        </mat-form-field>
        <div class="mobile-stack-actions flex flex-col gap-2 sm:flex-row sm:items-center">
          <button mat-flat-button color="primary" type="submit">{{ t('expenses_apply') }}</button>
          <button mat-button type="button" (click)="clearFilters()">{{ t('expenses_clear') }}</button>
        </div>
      </form>
        </mat-expansion-panel>
      </mat-accordion>
    </mat-card>

    <mat-card class="page-panel mt-4 p-5">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-lg font-semibold">{{ t('expenses_history') }}</h2>
        <span class="text-sm text-brand-muted">{{ expenses().length }} {{ t('expenses_records') }}</span>
      </div>
      <app-feedback-banner [message]="error()" tone="error" />
      <app-feedback-banner [message]="loading() ? t('expenses_loading') : ''" tone="info" />

      <div class="responsive-table-wrapper overflow-x-auto">
        <table class="responsive-table w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr class="border-b border-brand-border bg-brand-surface-muted text-sm text-brand-muted">
              <th class="py-2.5 pl-3 pr-3 font-medium">{{ t('expenses_date') }}</th>
              <th class="py-2.5 pr-3 font-medium">{{ t('expenses_concept') }}</th>
              <th class="py-2.5 pr-3 font-medium">{{ t('expenses_category') }}</th>
              <th class="py-2.5 pr-3 font-medium">{{ t('expenses_payment_method') }}</th>
              <th class="py-2.5 pr-3 text-right font-medium">{{ t('expenses_amount') }}</th>
            </tr>
          </thead>
          <tbody>
            @for (expense of expenses(); track expense.id) {
              <tr class="border-b border-brand-border/60 last:border-0">
                <td [attr.data-label]="t('expenses_date')" class="py-3 pl-3 pr-3 text-sm text-brand-muted">{{ formatDate(expense.date) }}</td>
                <td [attr.data-label]="t('expenses_concept')" class="py-3 pr-3 font-medium">{{ expense.concept }}</td>
                <td [attr.data-label]="t('expenses_category')" class="py-3 pr-3 text-sm">{{ categoryName(expense.subcategoryId ?? expense.categoryId) }}</td>
                <td [attr.data-label]="t('expenses_payment_method')" class="py-3 pr-3 text-sm text-brand-muted">{{ paymentLabel(expense) }}</td>
                <td [attr.data-label]="t('expenses_amount')" class="py-3 pr-3 text-right font-semibold">{{ formatMoney(expense.currency, expense.amount) }}</td>
              </tr>
            } @empty {
              <tr>
                <td class="py-6 text-brand-muted" colspan="5">{{ t('expenses_empty_filters') }}</td>
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
  private readonly i18n = inject(I18nService);
  readonly t = (key: string) => this.i18n.t(key);
  readonly categories = signal<Category[]>([]);
  readonly expenses = signal<Expense[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly saving = signal(false);
  readonly saveMessage = signal('');
  readonly rootCategories = computed(() => this.categories().filter((category) => !category.parentId));
  readonly selectedCategoryId = signal('');
  readonly subcategoriesForForm = computed(() =>
    this.categories().filter((category) => category.parentId === this.selectedCategoryId())
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
        this.selectedCategoryId.set(firstRoot.id);
      }
    });
    this.selectedCategoryId.set(this.form.controls.categoryId.value);
    this.form.controls.categoryId.valueChanges.subscribe((categoryId) => {
      this.selectedCategoryId.set(categoryId);
      this.form.controls.subcategoryId.setValue('');
    });
    this.loadExpenses();
  }

  loadExpenses() {
    this.loading.set(true);
    this.error.set('');
    const filters = this.filters.getRawValue();
    this.api.expenses({
      from: filters.from ? startOfDay(filters.from) : undefined,
      to: filters.to ? endOfDay(filters.to) : undefined,
      categoryId: filters.categoryId || undefined,
      currency: filters.currency ? filters.currency.toUpperCase() : undefined,
      paymentMethodKind: filters.paymentMethodKind ? filters.paymentMethodKind as 'cash' | 'transfer' | 'card' : undefined,
      limit: 100
    }).subscribe({
      next: (expenses) => {
        this.expenses.set(expenses);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(this.t('expenses_load_error'));
      }
    });
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
      paymentMethod: this.paymentMethodPayload(value.paymentKind, value.bank, value.cardType)
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.saveMessage.set(this.t('expenses_saved'));
        this.form.patchValue({ concept: '', amount: 0, subcategoryId: '', bank: '' });
        this.loadExpenses();
      },
      error: () => {
        this.saving.set(false);
        this.saveMessage.set(this.t('expenses_save_error'));
      }
    });
  }

  categoryName(categoryId: string) {
    return this.categories().find((category) => category.id === categoryId)?.name ?? this.t('expenses_uncategorized');
  }

  categoryLabel(category: Category) {
    if (!category.parentId) return category.name;
    return `${this.categoryName(category.parentId)} / ${category.name}`;
  }

  paymentLabel(expense: Expense) {
    if (expense.paymentMethod.kind === 'cash') return this.t('expenses_cash');
    if (expense.paymentMethod.kind === 'transfer') {
      return expense.paymentMethod.bank ? `${expense.paymentMethod.bank} ${this.t('expenses_transfer')}` : this.t('expenses_transfer');
    }
    const cardType = expense.paymentMethod.cardType
      ? `${expense.paymentMethod.cardType === 'debit' ? this.t('expenses_debit') : this.t('expenses_credit')} ${this.t('expenses_card')}`
      : this.t('expenses_card');
    return expense.paymentMethod.bank ? `${expense.paymentMethod.bank} ${cardType}` : cardType;
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

  private paymentMethodPayload(kind: string, bank: string, cardType: string) {
    if (kind === 'card') {
      return { kind: 'card', bank: bank || undefined, cardType: cardType as 'credit' | 'debit' };
    }

    if (kind === 'transfer') {
      return { kind: 'transfer', bank: bank || undefined };
    }

    return { kind: 'cash' };
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
