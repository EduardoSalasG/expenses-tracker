import type { PaymentMethod } from '../domain/types.js';

export interface ParsedExpenseMessage {
  status: 'ready' | 'needs_confirmation';
  amount?: number;
  currency?: string;
  concept?: string;
  paymentMethod?: PaymentMethod;
  missingFields: string[];
}

const currencyBySymbol: Record<string, string> = {
  '$': 'USD',
  '€': 'EUR',
  '£': 'GBP'
};

export function parseExpenseMessage(message: string, preferredCurrency: string): ParsedExpenseMessage {
  const trimmed = message.trim();
  const amountMatch = trimmed.match(/(?:([A-Z]{3})\s*)?([$€£])?\s*(\d+(?:[.,]\d{1,2})?)/i);
  const amount = amountMatch ? Number(amountMatch[3].replace(',', '.')) : undefined;
  const explicitCurrency = amountMatch?.[1]?.toUpperCase();
  const symbolCurrency = amountMatch?.[2] ? currencyBySymbol[amountMatch[2]] : undefined;
  const currency = explicitCurrency ?? symbolCurrency ?? preferredCurrency;

  const lower = trimmed.toLowerCase();
  const paymentMethod = parsePaymentMethod(lower);
  const concept = amountMatch
    ? trimmed.replace(amountMatch[0], '').replace(/\b(cash|efectivo|credit|debit|credito|debito|card|tarjeta)\b/gi, '').trim()
    : trimmed;

  const missingFields = [
    amount === undefined ? 'amount' : undefined,
    concept.length === 0 ? 'concept' : undefined,
    paymentMethod === undefined ? 'paymentMethod' : undefined
  ].filter((field): field is string => Boolean(field));

  return {
    status: missingFields.length === 0 ? 'ready' : 'needs_confirmation',
    amount,
    currency,
    concept: concept.length > 0 ? concept : undefined,
    paymentMethod,
    missingFields
  };
}

function parsePaymentMethod(lowerMessage: string): PaymentMethod | undefined {
  if (/\b(cash|efectivo)\b/.test(lowerMessage)) {
    return { kind: 'cash' };
  }

  const cardType = /\b(credit|credito|crédito)\b/.test(lowerMessage)
    ? 'credit'
    : /\b(debit|debito|débito)\b/.test(lowerMessage)
      ? 'debit'
      : undefined;

  if (cardType || /\b(card|tarjeta)\b/.test(lowerMessage)) {
    const bankMatch = lowerMessage.match(/\b(?:bank|banco)\s+([a-z0-9 -]+)/);
    return { kind: 'card', cardType, bank: bankMatch?.[1]?.trim() };
  }

  return undefined;
}
