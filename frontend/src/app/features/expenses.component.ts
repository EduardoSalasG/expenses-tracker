import { Component, Inject, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ApiService, type BankOption, type Category, type Expense, type PaymentMethodOption } from '../core/api.service';
import { I18nService } from '../core/i18n.service';
import { OnboardingService } from '../core/onboarding.service';
import { PeriodStateService } from '../core/period-state.service';
import { FeedbackBannerComponent } from '../shared/components/feedback-banner.component';
import { PageHeaderComponent } from '../shared/components/page-header.component';

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    MatSlideToggleModule,
    ReactiveFormsModule,
    FeedbackBannerComponent,
    PageHeaderComponent
  ],
  template: `
    <app-page-header [title]="t('expenses_title')" [eyebrow]="t('expenses_subtitle')"></app-page-header>

    <mat-card id="expenses-toolbar" class="page-panel mb-4 p-4">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="month"
          class="min-h-11 rounded border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-ink"
          [value]="selectedMonth()"
          (change)="changeMonth($event)"
        >
        <div class="flex items-center gap-2">
          <button id="expenses-filter-toggle" mat-stroked-button type="button" (click)="toggleFilters()">
            <mat-icon>tune</mat-icon>
            {{ t('expenses_filters_more') }}
          </button>
          <button id="expenses-new-button" mat-flat-button color="primary" type="button" (click)="openNewExpenseDialog()">
            <mat-icon>add</mat-icon>
            {{ t('expenses_new') }}
          </button>
        </div>
      </div>
      @if (filtersOpen()) {
        <form [formGroup]="filters" (ngSubmit)="loadExpenses()" class="mt-4 grid gap-4 lg:grid-cols-6">
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
      }
    </mat-card>

    <mat-card id="expenses-history-panel" class="page-panel p-5">
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
              <th class="py-2.5 pr-3 text-right font-medium">{{ t('expenses_actions') }}</th>
            </tr>
          </thead>
          <tbody>
            @for (expense of expenses(); track expense.id) {
              <tr class="border-b border-brand-border/60 last:border-0">
                <td [attr.data-label]="t('expenses_date')" class="py-3 pl-3 pr-3 text-sm text-brand-muted">{{ formatDate(expense.date) }}</td>
                <td [attr.data-label]="t('expenses_concept')" class="py-3 pr-3">
                  <div class="font-medium">{{ expense.concept }}</div>
                  @if ((expense.installmentCount ?? 1) > 1) {
                    <div class="mt-1 text-xs text-brand-muted">
                      {{ t('expenses_installment_badge') }} {{ expense.installmentNumber ?? 1 }}/{{ expense.installmentCount }}
                    </div>
                  }
                </td>
                <td [attr.data-label]="t('expenses_category')" class="py-3 pr-3 text-sm">{{ categoryName(expense.subcategoryId ?? expense.categoryId) }}</td>
                <td [attr.data-label]="t('expenses_payment_method')" class="py-3 pr-3 text-sm text-brand-muted">{{ paymentLabel(expense) }}</td>
                <td [attr.data-label]="t('expenses_amount')" class="py-3 pr-3 text-right font-semibold">{{ formatMoney(expense.currency, expense.amount) }}</td>
                <td [attr.data-label]="t('expenses_actions')" class="py-3 pr-3 text-right">
                  <button mat-stroked-button type="button" (click)="openEditExpenseDialog(expense)">
                    <mat-icon>edit</mat-icon>
                    {{ t('common_edit') }}
                  </button>
                </td>
              </tr>
            } @empty {
              <tr><td class="py-6 text-brand-muted" colspan="6">{{ t('expenses_empty_filters') }}</td></tr>
            }
          </tbody>
        </table>
      </div>
    </mat-card>
  `
})
export class ExpensesComponent implements OnInit {
  private readonly i18n = inject(I18nService);
  private readonly onboarding = inject(OnboardingService);
  private readonly periodState = inject(PeriodStateService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  readonly t = (key: string) => this.i18n.t(key);
  readonly categories = signal<Category[]>([]);
  readonly bankOptions = signal<BankOption[]>([]);
  readonly paymentMethodOptions = signal<PaymentMethodOption[]>([]);
  readonly expenses = signal<Expense[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly filtersOpen = signal(false);
  readonly selectedMonth = signal(this.periodState.selectedMonth());
  readonly filters = inject(FormBuilder).nonNullable.group({
    from: [''],
    to: [''],
    categoryId: [''],
    currency: [''],
    paymentMethodKind: ['']
  });
  readonly range = computed(() => rangeFromMonth(this.selectedMonth()));

  constructor(private readonly api: ApiService) {}

  ngOnInit() {
    this.api.categories().subscribe((categories) => this.categories.set(categories));
    this.api.bankOptions().subscribe((banks) => this.bankOptions.set(banks));
    this.api.paymentMethodOptions().subscribe((options) => this.paymentMethodOptions.set(options));
    const monthRange = this.range();
    this.filters.patchValue({ from: monthRange.fromInput, to: monthRange.toInput });
    this.loadExpenses();
  }

  changeMonth(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    if (!value || value === this.selectedMonth()) return;
    this.selectedMonth.set(value);
    this.periodState.setSelectedMonth(value);
    const monthRange = rangeFromMonth(value);
    this.filters.patchValue({ from: monthRange.fromInput, to: monthRange.toInput });
    this.loadExpenses();
  }

  toggleFilters() {
    this.filtersOpen.set(!this.filtersOpen());
  }

  openNewExpenseDialog() {
    const ref = this.dialog.open(ExpenseCreateDialogComponent, {
      width: 'min(960px, calc(100vw - 1.5rem))',
      maxWidth: 'calc(100vw - 1.5rem)',
      panelClass: 'brand-dialog-panel',
      autoFocus: false,
      data: { categories: this.categories(), bankOptions: this.bankOptions(), paymentMethodOptions: this.paymentMethodOptions() }
    });
    ref.afterClosed().subscribe((result: { saved: boolean; mode: 'create' | 'edit'; expense?: Expense } | undefined) => {
      if (result?.saved) {
        if (result.expense) {
          this.patchExpenseState(result.expense);
        }
        this.snackBar.open(this.t(result.mode === 'edit' ? 'expenses_updated' : 'expenses_saved'), undefined, { duration: 2400 });
        this.loadExpenses();
      }
    });
  }

  openEditExpenseDialog(expense: Expense) {
    const ref = this.dialog.open(ExpenseCreateDialogComponent, {
      width: 'min(960px, calc(100vw - 1.5rem))',
      maxWidth: 'calc(100vw - 1.5rem)',
      panelClass: 'brand-dialog-panel',
      autoFocus: false,
      data: { categories: this.categories(), bankOptions: this.bankOptions(), paymentMethodOptions: this.paymentMethodOptions(), expense }
    });
    ref.afterClosed().subscribe((result: { saved: boolean; mode: 'create' | 'edit'; expense?: Expense } | undefined) => {
      if (result?.saved) {
        if (result.expense) {
          this.patchExpenseState(result.expense);
        }
        this.snackBar.open(this.t('expenses_updated'), undefined, { duration: 2400 });
        this.loadExpenses();
      }
    });
  }

  loadExpenses() {
    this.loading.set(true);
    this.error.set('');
    const f = this.filters.getRawValue();
    this.api.expenses({
      from: f.from ? startOfDay(f.from) : undefined,
      to: f.to ? endOfDay(f.to) : undefined,
      categoryId: f.categoryId || undefined,
      currency: f.currency ? f.currency.toUpperCase() : undefined,
      paymentMethodKind: f.paymentMethodKind ? f.paymentMethodKind as 'cash' | 'transfer' | 'card' : undefined,
      limit: 100
    }).subscribe({
      next: (expenses) => {
        this.expenses.set(expenses);
        this.loading.set(false);
        setTimeout(() => this.startOnboarding(), 50);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(this.t('expenses_load_error'));
      }
    });
  }

  clearFilters() {
    const monthRange = this.range();
    this.filters.reset({ from: monthRange.fromInput, to: monthRange.toInput, categoryId: '', currency: '', paymentMethodKind: '' });
    this.loadExpenses();
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
    if (expense.paymentMethod.kind === 'transfer') return expense.paymentMethod.bank ? `${expense.paymentMethod.bank} ${this.t('expenses_transfer')}` : this.t('expenses_transfer');
    const cardType = expense.paymentMethod.cardType ? `${expense.paymentMethod.cardType === 'debit' ? this.t('expenses_debit') : this.t('expenses_credit')} ${this.t('expenses_card')}` : this.t('expenses_card');
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

  private patchExpenseState(updatedExpense: Expense) {
    this.expenses.update((items) => items.map((item) => {
      if (item.id !== updatedExpense.id) return item;
      return {
        ...item,
        concept: updatedExpense.concept,
        currency: updatedExpense.currency,
        categoryId: updatedExpense.categoryId,
        subcategoryId: updatedExpense.subcategoryId,
        paymentMethodOptionId: updatedExpense.paymentMethodOptionId,
        bankOptionId: updatedExpense.bankOptionId,
        paymentMethod: updatedExpense.paymentMethod,
        totalAmount: updatedExpense.totalAmount ?? updatedExpense.amount,
        purchaseDate: updatedExpense.purchaseDate,
        firstInstallmentDate: updatedExpense.firstInstallmentDate,
        installmentCount: updatedExpense.installmentCount,
        amount: (updatedExpense.installmentCount ?? 1) === 1
          ? (updatedExpense.totalAmount ?? updatedExpense.amount)
          : item.amount,
        date: (updatedExpense.installmentCount ?? 1) === 1
          ? updatedExpense.date
          : item.date
      };
    }));
  }

  private startOnboarding() {
    void this.onboarding.startOnce('expenses', [
      {
        element: '#expenses-toolbar',
        title: this.t('onboarding_expenses_title'),
        description: this.t('onboarding_expenses_desc')
      },
      {
        element: '#expenses-filter-toggle',
        title: this.t('onboarding_expenses_filters_title'),
        description: this.t('onboarding_expenses_filters_desc')
      },
      {
        element: '#expenses-new-button',
        title: this.t('onboarding_expenses_new_title'),
        description: this.t('onboarding_expenses_new_desc')
      },
      {
        element: '#expenses-history-panel',
        title: this.t('onboarding_expenses_history_title'),
        description: this.t('onboarding_expenses_history_desc')
      }
    ]);
  }
}

@Component({
  selector: 'app-expense-create-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatCardModule, MatSlideToggleModule],
  template: `
    <div class="brand-dialog-shell">
      <div class="brand-dialog-header">
        <h2 class="m-0 text-2xl font-semibold text-brand-ink">{{ expense() ? t('expenses_edit') : t('expenses_new') }}</h2>
      </div>
      <form [formGroup]="form" (ngSubmit)="save()" class="brand-dialog-form">
        <div class="brand-dialog-fields grid gap-4 lg:grid-cols-2">
          <mat-form-field appearance="outline"><mat-label>{{ t('expenses_concept') }}</mat-label><input matInput formControlName="concept"></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>{{ t('expenses_amount') }}</mat-label><input matInput type="number" formControlName="amount"></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>{{ t('expenses_currency') }}</mat-label><input matInput formControlName="currency" maxlength="3"></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>{{ t('expenses_date') }}</mat-label><input matInput type="date" formControlName="date"></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>{{ t('expenses_category') }}</mat-label><mat-select formControlName="categoryId">@for (category of rootCategories(); track category.id) {<mat-option [value]="category.id">{{ category.name }}</mat-option>}</mat-select></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>{{ t('expenses_subcategory') }}</mat-label><mat-select formControlName="subcategoryId"><mat-option [value]="''">{{ t('expenses_none') }}</mat-option>@for (category of subcategoriesForForm(); track category.id) {<mat-option [value]="category.id">{{ category.name }}</mat-option>}</mat-select></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>{{ t('expenses_payment_method') }}</mat-label><mat-select formControlName="paymentMethodOptionId">@for (option of paymentMethodOptions(); track option.id) {<mat-option [value]="option.id">{{ paymentMethodOptionLabel(option) }}</mat-option>}</mat-select></mat-form-field>
          @if (selectedPaymentMethodKind() === 'card' || selectedPaymentMethodKind() === 'transfer') {
            <mat-form-field appearance="outline"><mat-label>{{ t('expenses_bank') }}</mat-label><mat-select formControlName="bankOptionId"><mat-option [value]="''">{{ t('expenses_select_bank') }}</mat-option>@for (bank of bankOptions(); track bank.id) {<mat-option [value]="bank.id">{{ bank.name }}</mat-option>}</mat-select></mat-form-field>
          }
          <div class="rounded-xl border border-brand-border bg-brand-surface-muted p-4 lg:col-span-2">
            <mat-slide-toggle formControlName="installmentsEnabled">{{ t('expenses_installments_toggle') }}</mat-slide-toggle>
            @if (form.controls.installmentsEnabled.value) {
              <div class="mt-4 grid gap-4 md:grid-cols-2">
                <mat-form-field appearance="outline">
                  <mat-label>{{ t('expenses_installment_count') }}</mat-label>
                  <mat-select formControlName="installmentCount">
                    @for (count of installmentOptions; track count) {
                      <mat-option [value]="count">{{ count }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>{{ t('expenses_first_installment_date') }}</mat-label>
                  <input matInput type="date" formControlName="firstInstallmentDate">
                </mat-form-field>
              </div>
              <p class="m-0 text-sm text-brand-muted">{{ t('expenses_installments_help') }}</p>
            }
          </div>
        </div>
        <div class="brand-dialog-actions flex flex-col-reverse gap-2 sm:flex-row sm:justify-end lg:col-span-2">
          <button mat-button type="button" (click)="dialogRef.close(false)">{{ t('common_cancel') }}</button>
          <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving()">{{ saving() ? t('expenses_saving') : expense() ? t('common_update') : t('expenses_save') }}</button>
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
      height: 100%;
      max-height: calc(100vh - 3rem);
      flex-direction: column;
      gap: 1rem;
      overflow: hidden;
      padding: 1.25rem;
    }

    .brand-dialog-header {
      padding-right: 0.5rem;
    }

    .brand-dialog-actions {
      padding-top: 0.25rem;
    }

    @media (max-width: 767px) {
      .brand-dialog-shell {
        height: 100%;
        max-height: calc(100vh - 1.5rem);
        padding: 1rem;
      }
    }
  `]
})
export class ExpenseCreateDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly i18n = inject(I18nService);
  readonly t = (key: string) => this.i18n.t(key);
  readonly saving = signal(false);
  readonly installmentOptions = Array.from({ length: 24 }, (_, index) => index + 1);
  readonly categories = signal<Category[]>([]);
  readonly bankOptions = signal<BankOption[]>([]);
  readonly paymentMethodOptions = signal<PaymentMethodOption[]>([]);
  readonly expense = signal<Expense | null>(null);
  readonly selectedCategoryId = signal('');
  readonly selectedPaymentMethodKind = computed(() => this.selectedPaymentMethodOption()?.kind ?? 'cash');
  readonly rootCategories = computed(() => this.categories().filter((category) => !category.parentId));
  readonly subcategoriesForForm = computed(() => this.categories().filter((category) => category.parentId === this.selectedCategoryId()));
  readonly selectedPaymentMethodOption = computed(() => this.paymentMethodOptions().find((option) => option.id === this.form.controls.paymentMethodOptionId.value));
  readonly form = this.fb.nonNullable.group({
    concept: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    currency: ['CLP', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
    date: [toDateInputValue(new Date()), Validators.required],
    categoryId: ['', Validators.required],
    subcategoryId: [''],
    paymentMethodOptionId: ['', Validators.required],
    bankOptionId: [''],
    installmentsEnabled: [false],
    installmentCount: [1, [Validators.required, Validators.min(1), Validators.max(24)]],
    firstInstallmentDate: [toDateInputValue(new Date()), Validators.required]
  });

  constructor(
    readonly dialogRef: MatDialogRef<ExpenseCreateDialogComponent>,
    @Inject(MAT_DIALOG_DATA) data: { categories: Category[]; bankOptions: BankOption[]; paymentMethodOptions: PaymentMethodOption[]; expense?: Expense }
  ) {
    this.categories.set(data.categories ?? []);
    this.bankOptions.set(data.bankOptions ?? []);
    this.paymentMethodOptions.set(data.paymentMethodOptions ?? []);
    this.expense.set(data.expense ?? null);
    const existingExpense = data.expense;
    if (existingExpense) {
      const paymentMethodOptionId = existingExpense.paymentMethodOptionId
        ?? inferPaymentMethodOptionId(existingExpense, this.paymentMethodOptions());
      const bankOptionId = existingExpense.bankOptionId
        ?? inferBankOptionId(existingExpense, this.bankOptions());
      this.form.patchValue({
        concept: existingExpense.concept,
        amount: existingExpense.totalAmount ?? existingExpense.amount,
        currency: existingExpense.currency,
        date: toDateInputValue(new Date(existingExpense.purchaseDate ?? existingExpense.date)),
        categoryId: existingExpense.categoryId,
        subcategoryId: existingExpense.subcategoryId ?? '',
        paymentMethodOptionId: paymentMethodOptionId ?? '',
        bankOptionId: bankOptionId ?? '',
        installmentsEnabled: (existingExpense.installmentCount ?? 1) > 1,
        installmentCount: existingExpense.installmentCount ?? 1,
        firstInstallmentDate: toDateInputValue(new Date(existingExpense.firstInstallmentDate ?? existingExpense.date))
      });
      this.selectedCategoryId.set(existingExpense.categoryId);
    } else {
      const firstRoot = this.rootCategories()[0];
      const defaultPaymentMethod = this.paymentMethodOptions().find((option) => option.code === 'cash') ?? this.paymentMethodOptions()[0];
      if (firstRoot) {
        this.form.controls.categoryId.setValue(firstRoot.id);
        this.selectedCategoryId.set(firstRoot.id);
      }
      if (defaultPaymentMethod) {
        this.form.controls.paymentMethodOptionId.setValue(defaultPaymentMethod.id);
      }
    }
    this.form.controls.categoryId.valueChanges.subscribe((categoryId) => {
      this.selectedCategoryId.set(categoryId);
      this.form.controls.subcategoryId.setValue('');
    });
    this.form.controls.paymentMethodOptionId.valueChanges.subscribe(() => {
      if (this.selectedPaymentMethodKind() === 'cash') {
        this.form.controls.bankOptionId.setValue('');
      }
    });
    this.form.controls.installmentsEnabled.valueChanges.subscribe((enabled) => {
      if (!enabled) {
        this.form.controls.installmentCount.setValue(1);
        this.form.controls.firstInstallmentDate.setValue(this.form.controls.date.value);
      }
    });
    this.form.controls.date.valueChanges.subscribe((date) => {
      if (!this.form.controls.installmentsEnabled.value) {
        this.form.controls.firstInstallmentDate.setValue(date);
      }
    });
  }

  save() {
    const value = this.form.getRawValue();
    const selectedPaymentMethod = this.paymentMethodOptions().find((option) => option.id === value.paymentMethodOptionId);
    const selectedBank = this.bankOptions().find((bank) => bank.id === value.bankOptionId);
    if (!selectedPaymentMethod) {
      this.saving.set(false);
      return;
    }
    this.saving.set(true);
    const payload = {
      date: startOfDay(value.date),
      amount: Number(value.amount),
      currency: value.currency.toUpperCase(),
      concept: value.concept,
      categoryId: value.categoryId,
      subcategoryId: value.subcategoryId || undefined,
      paymentMethodOptionId: selectedPaymentMethod.id,
      bankOptionId: value.bankOptionId || undefined,
      installmentCount: value.installmentsEnabled ? Number(value.installmentCount) : 1,
      firstInstallmentDate: startOfDay(value.installmentsEnabled ? value.firstInstallmentDate : value.date),
      paymentMethod: paymentMethodPayload(selectedPaymentMethod, selectedBank)
    };
    const request = this.expense()
      ? this.api.updateExpense(this.expense()!.id, payload)
      : this.api.createExpense(payload);
    request.subscribe({
      next: (expense) => this.dialogRef.close({ saved: true, mode: this.expense() ? 'edit' : 'create', expense }),
      error: () => this.saving.set(false)
    });
  }

  paymentMethodOptionLabel(option: PaymentMethodOption) {
    return option.isDefault ? translatePaymentMethodOption(this.t, option) : option.name;
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
function paymentMethodPayload(option: PaymentMethodOption, bank?: BankOption) {
  if (option.kind === 'card') return { kind: 'card' as const, bank: bank?.name, cardType: option.cardType };
  if (option.kind === 'transfer') return { kind: 'transfer' as const, bank: bank?.name };
  return { kind: 'cash' as const };
}
function rangeFromMonth(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  const fromInput = `${year}-${String(monthNumber).padStart(2, '0')}-01`;
  const toDate = new Date(Date.UTC(year, monthNumber, 0));
  const toInput = `${toDate.getUTCFullYear()}-${String(toDate.getUTCMonth() + 1).padStart(2, '0')}-${String(toDate.getUTCDate()).padStart(2, '0')}`;
  return { fromInput, toInput };
}

function inferPaymentMethodOptionId(expense: Expense, options: PaymentMethodOption[]) {
  return options.find((option) =>
    option.kind === expense.paymentMethod.kind &&
    (option.kind !== 'card' || option.cardType === expense.paymentMethod.cardType)
  )?.id;
}

function inferBankOptionId(expense: Expense, banks: BankOption[]) {
  if (!expense.paymentMethod.bank) return undefined;
  const normalized = normalizeLabel(expense.paymentMethod.bank);
  return banks.find((bank) => normalizeLabel(bank.name) === normalized)?.id;
}

function normalizeLabel(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function translatePaymentMethodOption(t: (key: string) => string, option: PaymentMethodOption) {
  if (option.code === 'cash') return t('expenses_cash');
  if (option.code === 'transfer') return t('expenses_transfer');
  if (option.code === 'debit_card') return `${t('expenses_debit')} ${t('expenses_card')}`;
  if (option.code === 'credit_card') return `${t('expenses_credit')} ${t('expenses_card')}`;
  return option.name;
}
