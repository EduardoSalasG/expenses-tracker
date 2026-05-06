import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface PaymentMethod {
  kind: 'cash' | 'card';
  bank?: string;
  cardType?: 'credit' | 'debit';
}

export interface Expense {
  id: string;
  date: string;
  amount: number;
  currency: string;
  concept: string;
  categoryId: string;
  subcategoryId?: string;
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
  name: string;
  role: 'consumer' | 'admin';
  countryOfResidence: string;
  preferredCurrency: string;
  reportPreferences: ReportFrequency[];
}

export type ReportFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface MonthlyBudget {
  id: string;
  month: string;
  categoryId: string;
  subcategoryId?: string;
  amount: number;
  currency: string;
}

export interface Report {
  from: string;
  to: string;
  expenses: Expense[];
  incomes: Income[];
  expenseTotalsByCurrency: Record<string, number>;
  incomeTotalsByCurrency: Record<string, number>;
}

export interface ExpenseFilters {
  from?: string;
  to?: string;
  categoryId?: string;
  currency?: string;
  paymentMethodKind?: 'cash' | 'card';
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

  updateMe(payload: Pick<CurrentUser, 'name' | 'email' | 'countryOfResidence' | 'preferredCurrency'>) {
    return this.http.put<CurrentUser>(`${environment.apiBaseUrl}/me`, payload);
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

  createIncome(payload: unknown) {
    return this.http.post(`${environment.apiBaseUrl}/incomes`, payload);
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

  monthlyBudgets(month: string) {
    return this.http.get<MonthlyBudget[]>(`${environment.apiBaseUrl}/budgets/monthly`, {
      params: new HttpParams().set('month', month)
    });
  }

  upsertMonthlyBudget(payload: unknown) {
    return this.http.put(`${environment.apiBaseUrl}/budgets/monthly`, payload);
  }

  report(from: string, to: string) {
    return this.http.get<Report>(`${environment.apiBaseUrl}/reports`, {
      params: new HttpParams().set('from', from).set('to', to)
    });
  }

  updateReportPreferences(preferences: ReportFrequency[]) {
    return this.http.put(`${environment.apiBaseUrl}/report-preferences`, { preferences });
  }
}
