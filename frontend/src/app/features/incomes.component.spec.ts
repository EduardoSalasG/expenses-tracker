import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { IncomesComponent, parseIncomeFilterParams, serializeIncomeFilters } from './incomes.component';
import * as IncomesFeature from './incomes.component';
import { ApiService } from '../core/api.service';
import { AccountContextService } from '../core/account-context.service';
import { I18nService } from '../core/i18n.service';
import { OnboardingService } from '../core/onboarding.service';
import { PeriodStateService } from '../core/period-state.service';

describe('income filter parameters', () => {
  let fixture: ComponentFixture<IncomesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IncomesComponent, NoopAnimationsModule],
      providers: [
        { provide: ApiService, useValue: { incomes: () => of([]) } },
        {
          provide: AccountContextService,
          useValue: {
            activeAccount: () => null,
            activeAccountId: () => '',
            loading: signal(false)
          }
        },
        { provide: I18nService, useValue: { t: (key: string) => key, language: () => 'es' } },
        { provide: OnboardingService, useValue: { startOnce: () => Promise.resolve() } },
        { provide: PeriodStateService, useValue: { selectedMonth: () => '2026-09', setSelectedMonth: () => {} } },
        { provide: Router, useValue: jasmine.createSpyObj<Router>('Router', ['navigate']) },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(IncomesComponent);
    fixture.detectChanges();
  });

  it('uses native disclosure semantics for secondary filters', () => {
    const summary = fixture.nativeElement.querySelector('summary#incomes-filter-toggle') as HTMLElement | null;

    expect(summary).not.toBeNull();
    expect(summary?.closest('details')).not.toBeNull();
  });

  it('opens the semantic disclosure only when a secondary income filter is active', () => {
    const hasSecondaryFilters = (IncomesFeature as unknown as {
      hasSecondaryIncomeFilters?: (filters: { concept: string; currency: string }) => boolean;
    }).hasSecondaryIncomeFilters;

    expect(hasSecondaryFilters).withContext('the disclosure needs a pure state predicate').toEqual(jasmine.any(Function));
    expect(hasSecondaryFilters?.({ concept: '', currency: '' })).toBeFalse();
    expect(hasSecondaryFilters?.({ concept: 'Sueldo', currency: '' })).toBeTrue();
    expect(hasSecondaryFilters?.({ concept: '', currency: 'CLP' })).toBeTrue();
  });

  it('restores and serializes a canonical concept search', () => {
    expect(parseIncomeFilterParams({ month: '2026-09', concept: '  Sueldo  ', currency: 'clp' })).toEqual({
      month: '2026-09', concept: 'Sueldo', currency: 'CLP'
    });
    expect(serializeIncomeFilters({ month: '2026-09', concept: 'Sueldo', currency: 'CLP' })).toEqual({
      month: '2026-09', concept: 'Sueldo', currency: 'CLP'
    });
  });
});
