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
  let openDialog: jasmine.Spy;

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
        { provide: AccountContextService, useValue: { activeAccountId: signal('account-1'), loading: signal(false) } },
        { provide: I18nService, useValue: { language: signal<'es' | 'en'>('es'), t: (key: string) => key } },
        { provide: OnboardingService, useValue: { startOnce: () => Promise.resolve() } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BudgetsComponent);
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    openDialog = spyOn(fixture.debugElement.injector.get(MatDialog), 'open').and.returnValue({
      afterClosed: () => of(undefined)
    } as never);
  });

  it('opens the budget dialog from the primary create action without exposing a month selector', () => {
    expect(fixture.nativeElement.querySelector('input[name="budgetsMonth"]')).toBeNull();

    const action = fixture.nativeElement.querySelector('#budgets-create-button') as HTMLButtonElement | null;
    expect(action).withContext('budget creation needs one discoverable primary action').not.toBeNull();
    action?.click();

    expect(openDialog).toHaveBeenCalled();
  });
});
