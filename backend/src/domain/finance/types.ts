import type { CategoryId } from '../categories/index.js';
import type { TenantId } from '../tenancy/index.js';
import type { UserId } from '../users/index.js';

export type ExpenseId = string;
export type CurrencyCode = string;
export type ReportFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type CardType = 'credit' | 'debit';
export type PaymentMethodKind = 'cash' | 'card' | 'transfer';

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
