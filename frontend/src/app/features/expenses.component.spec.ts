import {
  expenseDateRange,
  hasSecondaryExpenseFilters,
  parseExpenseFilterParams,
  serializeExpenseFilters,
  ExpensesComponent
} from './expenses.component';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, Subject } from 'rxjs';
import { AccountContextService } from '../core/account-context.service';
import { ApiService, type Category, type Expense, type FinancialAccount, type FinancialAccountMemberProfile, type FinancialAccountMembership } from '../core/api.service';
import { I18nService } from '../core/i18n.service';
import { OnboardingService } from '../core/onboarding.service';
import { PeriodStateService } from '../core/period-state.service';
import { formatExpenseDate } from '../core/transaction-date';
import { ExpenseCreateDialogComponent } from './expenses.component';
import * as ExpensesFeature from './expenses.component';

describe('expense filter disclosure', () => {
  it('describes every active expense filter with its localized effective value', () => {
    const summary = (ExpensesFeature as unknown as {
      expenseActiveFilterSummary?: (filters: Record<string, string>, context: {
        language: 'es' | 'en';
        categories: Array<{ id: string; parentId?: string; name: string; nameEs?: string; nameEn?: string }>;
        bankOptions: Array<{ id: string; name: string }>;
        paymentMethodOptions: Array<{ id: string; name: string }>;
        t: (key: string) => string;
      }) => Array<{ label: string; value: string }>;
    }).expenseActiveFilterSummary;

    expect(summary).withContext('the UI needs a pure source of truth for the active-filter summary').toEqual(jasmine.any(Function));
    expect(summary?.({
      from: '2026-09-01',
      to: '2026-09-30',
      concept: 'Netflix',
      categoryId: 'other',
      subcategoryId: 'subscriptions',
      currency: 'clp',
      bankOptionId: 'bank-1',
      paymentMethodOptionId: 'card-1',
      paymentMethodKind: 'card'
    }, {
      language: 'es',
      categories: [
        { id: 'other', name: 'Other', nameEs: 'Otros' },
        { id: 'subscriptions', parentId: 'other', name: 'Subscriptions', nameEs: 'Suscripciones' }
      ],
      bankOptions: [{ id: 'bank-1', name: 'Banco largo' }],
      paymentMethodOptions: [{ id: 'card-1', name: 'Visa principal' }],
      t: (key) => ({
        expenses_period: 'Período',
        expenses_concept: 'Concepto',
        expenses_category: 'Categoría',
        expenses_currency: 'Moneda',
        expenses_bank: 'Banco',
        expenses_payment_option: 'Medio de pago',
        expenses_payment_method_kind: 'Tipo de medio de pago',
        expenses_card: 'Tarjeta'
      }[key] ?? key)
    })).toEqual([
      { label: 'Período', value: '2026-09-01 — 2026-09-30' },
      { label: 'Concepto', value: 'Netflix' },
      { label: 'Categoría', value: 'Otros / Suscripciones' },
      { label: 'Moneda', value: 'CLP' },
      { label: 'Banco', value: 'Banco largo' },
      { label: 'Medio de pago', value: 'Visa principal' },
      { label: 'Tipo de medio de pago', value: 'Tarjeta' }
    ]);
  });

  it('renders an installment date in UTC so a September boundary never appears as August in Chile', () => {
    expect(formatExpenseDate('2026-09-01T00:00:00.000Z', 'es')).toBe('1 sept 2026');
  });

  it('uses UTC month boundaries so filters match dashboard report totals in every browser timezone', () => {
    expect(expenseDateRange('2026-09-01', '2026-09-30')).toEqual({
      from: '2026-09-01T00:00:00.000Z',
      to: '2026-09-30T23:59:59.999Z'
    });
  });

  it('identifies active secondary filters without treating the period as secondary', () => {
    expect(hasSecondaryExpenseFilters({ concept: '', categoryId: '', subcategoryId: '', paymentMethodOptionId: '', bankOptionId: '', currency: '', paymentMethodKind: '' })).toBeFalse();
    expect(hasSecondaryExpenseFilters({ concept: '', categoryId: 'food', subcategoryId: '', paymentMethodOptionId: '', bankOptionId: '', currency: '', paymentMethodKind: '' })).toBeTrue();
    expect(hasSecondaryExpenseFilters({ concept: '', categoryId: '', subcategoryId: '', paymentMethodOptionId: '', bankOptionId: '', currency: 'CLP', paymentMethodKind: '' })).toBeTrue();
    expect(hasSecondaryExpenseFilters({ concept: 'netflix', categoryId: '', subcategoryId: '', paymentMethodOptionId: '', bankOptionId: '', currency: '', paymentMethodKind: '' })).toBeTrue();
  });

  it('accepts only safe deep-linked financial filters and serializes their canonical form', () => {
    expect(parseExpenseFilterParams({
      month: '2026-09',
      concept: 'Netflix',
      categoryId: 'food-2026',
      subcategoryId: 'subscriptions',
      paymentMethodOptionId: 'visa-card',
      bankOptionId: 'banco-largo',
      currency: 'clp',
      paymentMethodKind: 'card'
    })).toEqual({
      month: '2026-09',
      concept: 'Netflix',
      categoryId: 'food-2026',
      subcategoryId: 'subscriptions',
      paymentMethodOptionId: 'visa-card',
      bankOptionId: 'banco-largo',
      currency: 'CLP',
      paymentMethodKind: 'card'
    });

    expect(parseExpenseFilterParams({ month: '2026-19', categoryId: '<script>', currency: 'CLPX', paymentMethodKind: 'wire' })).toEqual({});
    expect(serializeExpenseFilters({ month: '2026-09', concept: 'Netflix', categoryId: 'food-2026', subcategoryId: 'subscriptions', paymentMethodOptionId: 'visa-card', bankOptionId: 'banco-largo', currency: 'CLP', paymentMethodKind: 'card' })).toEqual({
      month: '2026-09',
      concept: 'Netflix',
      categoryId: 'food-2026',
      subcategoryId: 'subscriptions',
      paymentMethodOptionId: 'visa-card',
      bankOptionId: 'banco-largo',
      currency: 'CLP',
      paymentMethodKind: 'card'
    });
    expect(serializeExpenseFilters({ month: '2026-09', categoryId: '', currency: '', paymentMethodKind: '' })).toEqual({ month: '2026-09' });
  });
});

describe('ExpensesComponent category catalog refresh', () => {
  let fixture: ComponentFixture<ExpensesComponent>;
  let component: ExpensesComponent;
  let openDialog: jasmine.Spy;
  let api: jasmine.SpyObj<ApiService>;
  let refreshedCategories: Subject<Category[]>;
  const activeAccount = signal<FinancialAccount | null>(null);
  const accountMembers = signal<FinancialAccountMemberProfile[]>([]);

  const initialCategories: Category[] = [{ id: 'food', name: 'Food', isDefault: false }];
  const createdRoot: Category = { id: 'home', name: 'Home', isDefault: false };
  const createdSubcategory: Category = { id: 'cleaning', parentId: 'home', name: 'Cleaning', isDefault: false };

  beforeEach(async () => {
    activeAccount.set(null);
    accountMembers.set([]);
    refreshedCategories = new Subject<Category[]>();
    api = jasmine.createSpyObj<ApiService>('ApiService', ['categories', 'bankOptions', 'paymentMethodOptions', 'me', 'expenses']);
    api.categories.and.returnValues(of(initialCategories), refreshedCategories.asObservable());
    api.bankOptions.and.returnValue(of([]));
    api.paymentMethodOptions.and.returnValue(of([]));
    api.me.and.returnValue(of({
      id: 'user-1',
      phoneNumber: '+56900000000',
      firstName: 'Ana',
      lastName: 'Pérez',
      preferredName: 'Ana',
      role: 'consumer',
      countryOfResidence: 'CL',
      preferredCurrency: 'CLP',
      reportPreferences: []
    }));
    api.expenses.and.returnValue(of([]));
    await TestBed.configureTestingModule({
      imports: [ExpensesComponent, NoopAnimationsModule],
      providers: [
        { provide: ApiService, useValue: api },
        { provide: MatSnackBar, useValue: jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']) },
        {
          provide: AccountContextService,
          useValue: {
            activeAccount,
            activeAccountId: signal('account-1'),
            activeMembership: () => activeAccount()?.type === 'shared' ? sharedAccountMembership() : null,
            loading: signal(false),
            members: accountMembers,
            refreshMembers: () => of([])
          }
        },
        { provide: I18nService, useValue: { language: signal<'es' | 'en'>('es'), t: (key: string) => key } },
        { provide: OnboardingService, useValue: { startOnce: () => Promise.resolve() } },
        { provide: PeriodStateService, useValue: { selectedMonth: signal('2026-09'), setSelectedMonth: () => {} } },
        { provide: Router, useValue: jasmine.createSpyObj<Router>('Router', ['navigate']) },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ExpensesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    openDialog = spyOn(fixture.debugElement.injector.get(MatDialog), 'open');
  });

  it('renders the category created inline after its expense dialog closes', () => {
    const expense = expenseFor(createdRoot.id);
    api.expenses.and.returnValue(of([expense]));
    openDialog.and.returnValue(dialogResult(expense) as never);

    component.openNewExpenseDialog();
    expect(component.expenses()).toEqual([]);

    refreshedCategories.next([...initialCategories, createdRoot]);
    fixture.detectChanges();

    expect(categoryCellText(fixture)).toContain('Home');
  });

  it('keeps an edited expense hidden until its newly created subcategory can be labeled', () => {
    const existingExpense = expenseFor('food');
    const updatedExpense = expenseFor(createdRoot.id, createdSubcategory.id);
    component.expenses.set([existingExpense]);
    api.expenses.and.returnValue(of([updatedExpense]));
    openDialog.and.returnValue(dialogResult(updatedExpense, 'edit') as never);

    component.openEditExpenseDialog(existingExpense);
    expect(component.expenses()[0].categoryId).toBe('food');
    expect(component.expenses()[0].subcategoryId).toBeUndefined();

    refreshedCategories.next([...initialCategories, createdRoot, createdSubcategory]);
    fixture.detectChanges();

    expect(categoryCellText(fixture)).toContain('Home / Cleaning');
  });

  it('shows the payer from shared-account members when an expense omits the payer name', () => {
    const account = sharedAccountMembership();
    activeAccount.set(account.account);
    accountMembers.set(sharedMembers());
    TestBed.flushEffects();
    component.expenses.set([{
      ...expenseFor('food'),
      createdByPreferredName: 'Ana',
      paidByUserId: 'user-2'
    }]);

    fixture.detectChanges();

    const payerCell = fixture.nativeElement.querySelector('.transaction-cell--recorded') as HTMLElement;
    expect(payerCell.textContent).toContain('expenses_paid_by');
    expect(payerCell.textContent).toContain('Bruno');
    expect(payerCell.textContent).not.toContain('Ana');
    expect((payerCell.querySelector('.transaction-author-name') as HTMLElement).textContent).toContain('Bruno');
  });
});

describe('ExpenseCreateDialogComponent shared defaults', () => {
  it('defaults a new shared expense to equal allocations', async () => {
    const api = jasmine.createSpyObj<ApiService>('ApiService', ['createExpense', 'updateExpense', 'createCategory', 'createBankOption', 'createPaymentMethodOption']);
    await TestBed.configureTestingModule({
      imports: [ExpenseCreateDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: ApiService, useValue: api },
        { provide: I18nService, useValue: { language: () => 'es', t: (key: string) => key } },
        { provide: MatDialog, useValue: jasmine.createSpyObj<MatDialog>('MatDialog', ['open']) },
        { provide: MatDialogRef, useValue: jasmine.createSpyObj<MatDialogRef<ExpenseCreateDialogComponent>>('MatDialogRef', ['close']) },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            categories: [{ id: 'food', name: 'Comida', isDefault: false }],
            bankOptions: [],
            paymentMethodOptions: [{ id: 'cash', code: 'cash', name: 'Efectivo', kind: 'cash', isDefault: true }],
            accountMembership: sharedAccountMembership(),
            accountMembers: sharedMembers(),
            currentUserId: 'user-1'
          }
        }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(ExpenseCreateDialogComponent);
    fixture.detectChanges();
    fixture.componentInstance.form.controls.amount.setValue(100);

    expect(fixture.componentInstance.form.controls.allocationMode.value).toBe('equal');
    expect(fixture.componentInstance.allocationControl('user-1').value).toBe(50);
    expect(fixture.componentInstance.allocationControl('user-2').value).toBe(50);
  });

  it('preserves the stored allocation mode when editing a shared expense', async () => {
    const api = jasmine.createSpyObj<ApiService>('ApiService', ['createExpense', 'updateExpense', 'createCategory', 'createBankOption', 'createPaymentMethodOption']);
    await TestBed.configureTestingModule({
      imports: [ExpenseCreateDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: ApiService, useValue: api },
        { provide: I18nService, useValue: { language: () => 'es', t: (key: string) => key } },
        { provide: MatDialog, useValue: jasmine.createSpyObj<MatDialog>('MatDialog', ['open']) },
        { provide: MatDialogRef, useValue: jasmine.createSpyObj<MatDialogRef<ExpenseCreateDialogComponent>>('MatDialogRef', ['close']) },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            categories: [{ id: 'food', name: 'Comida', isDefault: false }],
            bankOptions: [],
            paymentMethodOptions: [{ id: 'cash', code: 'cash', name: 'Efectivo', kind: 'cash', isDefault: true }],
            accountMembership: sharedAccountMembership(),
            accountMembers: sharedMembers(),
            currentUserId: 'user-1',
            expense: {
              ...expenseFor('food'),
              paidByUserId: 'user-2',
              allocationMode: 'custom',
              allocations: [{ owedByUserId: 'user-1', amount: 30 }, { owedByUserId: 'user-2', amount: 70 }]
            }
          }
        }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(ExpenseCreateDialogComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.form.controls.allocationMode.value).toBe('custom');
    expect(fixture.componentInstance.allocationControl('user-1').value).toBe(30);
    expect(fixture.componentInstance.allocationControl('user-2').value).toBe(70);
  });
});

function categoryCellText(fixture: ComponentFixture<ExpensesComponent>) {
  return (fixture.nativeElement.querySelector('.transaction-cell--category') as HTMLElement | null)?.textContent ?? '';
}

function dialogResult(expense: Expense, mode: 'create' | 'edit' = 'create') {
  return { afterClosed: () => of({ saved: true, mode, expense }) };
}

function expenseFor(categoryId: string, subcategoryId?: string): Expense {
  return {
    id: 'expense-1',
    financialAccountId: 'account-1',
    date: '2026-09-20T00:00:00.000Z',
    amount: 5000,
    currency: 'CLP',
    concept: 'Pan',
    categoryId,
    subcategoryId,
    paymentMethod: { kind: 'cash' }
  };
}

function sharedAccountMembership(): FinancialAccountMembership {
  return {
    account: {
      id: 'shared-account',
      tenantId: 'tenant-1',
      type: 'shared',
      name: 'Hogar',
      currency: 'CLP',
      createdByUserId: 'user-1',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z'
    },
    role: 'owner'
  };
}

function sharedMembers(): FinancialAccountMemberProfile[] {
  return [
    { memberId: 'member-1', financialAccountId: 'shared-account', userId: 'user-1', role: 'owner', status: 'active', createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z', firstName: 'Ana', lastName: 'Pérez', preferredName: 'Ana', phoneNumber: '+56900000001' },
    { memberId: 'member-2', financialAccountId: 'shared-account', userId: 'user-2', role: 'member', status: 'active', createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z', firstName: 'Bruno', lastName: 'Soto', preferredName: 'Bruno', phoneNumber: '+56900000002' }
  ];
}
