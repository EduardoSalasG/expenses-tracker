import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface PaymentMethod {
  kind: 'cash' | 'card' | 'transfer';
  bank?: string;
  cardType?: 'credit' | 'debit';
}

export interface BankOption {
  id: string;
  tenantId?: string;
  name: string;
  isDefault: boolean;
}

export interface PaymentMethodOption {
  id: string;
  tenantId?: string;
  code: string;
  name: string;
  kind: 'cash' | 'card' | 'transfer';
  cardType?: 'credit' | 'debit';
  isDefault: boolean;
}

export interface Expense {
  id: string;
  date: string;
  amount: number;
  currency: string;
  concept: string;
  categoryId: string;
  subcategoryId?: string;
  paymentMethodOptionId?: string;
  bankOptionId?: string;
  paymentMethod: PaymentMethod;
}

export interface Income {
  id: string;
  date: string;
  amount: number;
  currency: string;
  concept: string;
}

export interface Category {
  id: string;
  name: string;
  parentId?: string;
  isDefault: boolean;
}

export interface CurrentUser {
  id: string;
  email?: string;
  phoneNumber: string;
  telegramChatId?: string;
  telegramUsername?: string;
  firstName: string;
  lastName: string;
  preferredName: string;
  role: 'consumer' | 'admin';
  countryOfResidence: string;
  preferredCurrency: string;
  preferredLanguage?: 'es' | 'en';
  reportPreferences: ReportFrequency[];
}

export type ReportFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface MonthlyBudget {
  id: string;
  categoryId: string;
  subcategoryId?: string;
  amount: number;
  currency: string;
}

export interface TelegramRegistrationLinkResponse {
  phoneNumber: string;
  botUrl: string;
}

export interface Report {
  from: string;
  to: string;
  expenses: Expense[];
  incomes: Income[];
  expenseTotalsByCurrency: Record<string, number>;
  incomeTotalsByCurrency: Record<string, number>;
  expenseVariationByCategory: Array<{
    categoryId: string;
    categoryName: string;
    currency: string;
    currentTotal: number;
    previousTotal: number;
    delta: number;
    deltaPercent: number | null;
  }>;
}

export interface ExpenseFilters {
  from?: string;
  to?: string;
  categoryId?: string;
  currency?: string;
  paymentMethodKind?: 'cash' | 'card' | 'transfer';
  limit?: number;
}

export interface IncomeFilters {
  from?: string;
  to?: string;
  currency?: string;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private readonly http: HttpClient) {}

  me() {
    return this.http.get<CurrentUser>(`${environment.apiBaseUrl}/me`);
  }

  updateMe(payload: Pick<CurrentUser, 'firstName' | 'lastName' | 'preferredName' | 'email' | 'countryOfResidence' | 'preferredCurrency' | 'preferredLanguage'>) {
    return this.http.put<CurrentUser>(`${environment.apiBaseUrl}/me`, payload);
  }

  createTelegramRegistrationLink(phoneNumber: string) {
    return this.http.post<TelegramRegistrationLinkResponse>(`${environment.apiBaseUrl}/auth/telegram/registration-link`, { phoneNumber });
  }

  expenses(filters: ExpenseFilters = {}) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== '') params = params.set(key, String(value));
    }
    return this.http.get<Expense[]>(`${environment.apiBaseUrl}/expenses`, { params });
  }

  recentExpenses(limit = 10) {
    return this.http.get<Expense[]>(`${environment.apiBaseUrl}/expenses/recent`, {
      params: new HttpParams().set('limit', limit)
    });
  }

  createExpense(payload: unknown) {
    return this.http.post(`${environment.apiBaseUrl}/expenses`, payload);
  }

  updateExpense(expenseId: string, payload: unknown) {
    return this.http.put(`${environment.apiBaseUrl}/expenses/${expenseId}`, payload);
  }

  createIncome(payload: unknown) {
    return this.http.post(`${environment.apiBaseUrl}/incomes`, payload);
  }

  updateIncome(incomeId: string, payload: unknown) {
    return this.http.put(`${environment.apiBaseUrl}/incomes/${incomeId}`, payload);
  }

  incomes(filters: IncomeFilters = {}) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== '') params = params.set(key, String(value));
    }
    return this.http.get<Income[]>(`${environment.apiBaseUrl}/incomes`, { params });
  }

  categories() {
    return this.http.get<Category[]>(`${environment.apiBaseUrl}/categories`);
  }

  createCategory(payload: unknown) {
    return this.http.post(`${environment.apiBaseUrl}/categories`, payload);
  }

  bankOptions() {
    return this.http.get<BankOption[]>(`${environment.apiBaseUrl}/banks`);
  }

  createBankOption(payload: { name: string }) {
    return this.http.post<BankOption>(`${environment.apiBaseUrl}/banks`, payload);
  }

  paymentMethodOptions() {
    return this.http.get<PaymentMethodOption[]>(`${environment.apiBaseUrl}/payment-method-options`);
  }

  createPaymentMethodOption(payload: { name: string; kind: 'cash' | 'card' | 'transfer'; cardType?: 'credit' | 'debit' }) {
    return this.http.post<PaymentMethodOption>(`${environment.apiBaseUrl}/payment-method-options`, payload);
  }

  monthlyBudgets() {
    return this.http.get<MonthlyBudget[]>(`${environment.apiBaseUrl}/budgets`);
  }

  upsertMonthlyBudget(payload: unknown) {
    return this.http.put(`${environment.apiBaseUrl}/budgets`, payload);
  }

  report(from: string, to: string) {
    return this.http.get<Report>(`${environment.apiBaseUrl}/reports`, {
      params: new HttpParams().set('from', from).set('to', to)
    });
  }

  yearlyExpensesMonthlyTotals(year: number) {
    return this.http.get<Array<{ periodKey: string; currency: string; total: number }>>(
      `${environment.apiBaseUrl}/reports/expenses/yearly-monthly`,
      { params: new HttpParams().set('year', year) }
    );
  }

  monthlyExpensesDailyTotals(month: string) {
    return this.http.get<Array<{ periodKey: string; currency: string; total: number }>>(
      `${environment.apiBaseUrl}/reports/expenses/monthly-daily`,
      { params: new HttpParams().set('month', month) }
    );
  }

  weeklyExpensesDailyTotals(weekStart: string) {
    return this.http.get<Array<{ periodKey: string; currency: string; total: number }>>(
      `${environment.apiBaseUrl}/reports/expenses/weekly-daily`,
      { params: new HttpParams().set('weekStart', weekStart) }
    );
  }

  yearlyIncomesMonthlyTotals(year: number) {
    return this.http.get<Array<{ periodKey: string; currency: string; total: number }>>(
      `${environment.apiBaseUrl}/reports/incomes/yearly-monthly`,
      { params: new HttpParams().set('year', year) }
    );
  }

  monthlyIncomesDailyTotals(month: string) {
    return this.http.get<Array<{ periodKey: string; currency: string; total: number }>>(
      `${environment.apiBaseUrl}/reports/incomes/monthly-daily`,
      { params: new HttpParams().set('month', month) }
    );
  }

  periodExpenseCategoryTotals(from: string, to: string) {
    return this.http.get<Array<{ categoryId: string; subcategoryId?: string; currency: string; total: number }>>(
      `${environment.apiBaseUrl}/reports/expenses/category-totals`,
      { params: new HttpParams().set('from', from).set('to', to) }
    );
  }

  updateReportPreferences(preferences: ReportFrequency[]) {
    return this.http.put(`${environment.apiBaseUrl}/report-preferences`, { preferences });
  }
}
