import type { CurrencyCode } from '../types.js';

export interface Money {
  amount: number;
  currency: CurrencyCode;
}

export function createMoney(amount: number, currency: CurrencyCode): Money {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Money amount must be positive.');
  }

  const normalizedCurrency = currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalizedCurrency)) {
    throw new Error('Money currency must be an ISO-like 3-letter code.');
  }

  return { amount, currency: normalizedCurrency };
}
