import { TestBed } from '@angular/core/testing';
import { I18nService } from './i18n.service';

describe('I18nService accessible control labels', () => {
  const accessibleControlKeys = [
    'app_home_link',
    'dashboard_period_label',
    'dashboard_month_label',
    'dashboard_year_label',
    'dashboard_cash_flow_chart_label',
    'dashboard_category_chart_label',
    'dashboard_subcategory_chart_label',
    'dashboard_weekly_chart_label',
    'dashboard_member_balances_label',
    'dashboard_installments_chart_label',
    'incomes_month_label',
    'expenses_month_label',
    'expenses_category_filter_label',
    'expenses_subcategory_filter_label',
    'expenses_payment_option_filter_label',
    'expenses_bank_filter_label',
    'expenses_payment_method_filter_label',
    'expenses_paid_by_label',
    'expenses_allocation_mode_label',
    'expenses_installment_count_label',
    'budgets_category_label',
    'budgets_subcategory_label'
  ] as const;

  afterEach(() => {
    localStorage.removeItem('expenses_tracker_language');
    TestBed.resetTestingModule();
  });

  for (const language of ['es', 'en'] as const) {
    it(`provides localized accessible labels in ${language}`, () => {
      TestBed.configureTestingModule();
      const i18n = TestBed.inject(I18nService);
      i18n.setLanguage(language);

      for (const key of accessibleControlKeys) {
        expect(i18n.t(key)).withContext(`${language}:${key}`).not.toBe(key);
      }
    });
  }
});
