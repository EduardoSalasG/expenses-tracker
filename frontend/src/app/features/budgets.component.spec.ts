import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { AccountContextService } from '../core/account-context.service';
import { ApiService, type Report } from '../core/api.service';
import { I18nService } from '../core/i18n.service';
import { OnboardingService } from '../core/onboarding.service';
import { BudgetsComponent } from './budgets.component';

describe('BudgetsComponent empty-state action', () => {
  let fixture: ComponentFixture<BudgetsComponent>;

  beforeEach(async () => {
    const api = jasmine.createSpyObj<ApiService>('ApiService', ['categories', 'monthlyBudgets', 'report']);
    api.categories.and.returnValue(of([]));
    api.monthlyBudgets.and.returnValue(of([]));
    const report: Report = {
      from: '2026-09-01T00:00:00.000Z',
      to: '2026-09-30T23:59:59.999Z',
      expenses: [],
      incomes: [],
      expenseTotalsByCurrency: {},
      incomeTotalsByCurrency: {},
      expenseVariationByCategory: []
    };
    api.report.and.returnValue(of(report));

    await TestBed.configureTestingModule({
      imports: [BudgetsComponent, NoopAnimationsModule],
      providers: [
        { provide: ApiService, useValue: api },
        { provide: MatDialog, useValue: jasmine.createSpyObj<MatDialog>('MatDialog', ['open']) },
        { provide: AccountContextService, useValue: { activeAccountId: signal('account-1'), loading: signal(false) } },
        { provide: I18nService, useValue: { language: signal<'es' | 'en'>('es'), t: (key: string) => key } },
        { provide: OnboardingService, useValue: { startOnce: () => Promise.resolve() } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BudgetsComponent);
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
  });

  it('opens the budget form from the localized empty-state action', () => {
    const action = [...fixture.nativeElement.querySelectorAll('app-empty-state button')]
      .find((button: HTMLButtonElement) => button.textContent?.trim() === 'budgets_create') as HTMLButtonElement | undefined;

    expect(action).toBeDefined();
    action?.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.budgetFormOpen()).toBeTrue();
    expect(fixture.nativeElement.querySelector('#budgets-form-panel mat-expansion-panel')?.classList).toContain('mat-expanded');
  });
});
