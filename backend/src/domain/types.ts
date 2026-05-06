export type TenantId = string;
export type UserId = string;
export type CategoryId = string;
export type ExpenseId = string;

export type CurrencyCode = string;
export type ReportFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type CardType = 'credit' | 'debit';
export type PaymentMethodKind = 'cash' | 'card' | 'transfer';

export interface User {
  id: UserId;
  tenantId: TenantId;
  email?: string;
  phoneNumber: string;
  name: string;
  role: 'consumer' | 'admin';
  countryOfResidence: string;
  preferredCurrency: CurrencyCode;
  reportPreferences: ReportFrequency[];
}

export interface Category {
  id: CategoryId;
  tenantId: TenantId;
  name: string;
  parentId?: CategoryId;
  isDefault: boolean;
}

export interface PaymentMethod {
  kind: PaymentMethodKind;
  bank?: string;
  cardType?: CardType;
}

export interface Expense {
  id: ExpenseId;
  tenantId: TenantId;
  userId: UserId;
  date: string;
  amount: number;
  currency: CurrencyCode;
  concept: string;
  categoryId: CategoryId;
  subcategoryId?: CategoryId;
  paymentMethod: PaymentMethod;
  originalMessage?: string;
}

export interface Income {
  id: string;
  tenantId: TenantId;
  userId: UserId;
  date: string;
  amount: number;
  currency: CurrencyCode;
  concept: string;
}

export interface MonthlyBudget {
  id: string;
  tenantId: TenantId;
  month: string;
  categoryId: CategoryId;
  subcategoryId?: CategoryId;
  amount: number;
  currency: CurrencyCode;
}
