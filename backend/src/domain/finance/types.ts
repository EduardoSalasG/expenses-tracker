import type { CategoryId } from '../categories/index.js';
import type { TenantId } from '../tenancy/index.js';
import type { UserId } from '../users/index.js';

export type ExpenseId = string;
export type CurrencyCode = string;
export type ReportFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type CardType = 'credit' | 'debit';
export type PaymentMethodKind = 'cash' | 'card' | 'transfer';

export interface BankOption {
  id: string;
  tenantId?: TenantId;
  name: string;
  isDefault: boolean;
}

export interface PaymentMethodOption {
  id: string;
  tenantId?: TenantId;
  code: string;
  name: string;
  kind: PaymentMethodKind;
  cardType?: CardType;
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
  paymentMethodOptionId?: string;
  bankOptionId?: string;
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
  categoryId: CategoryId;
  subcategoryId?: CategoryId;
  amount: number;
  currency: CurrencyCode;
}
