import type { PaymentMethod } from '../domain/types.js';

export interface ParsedExpenseMessage {
  status: 'ready' | 'needs_confirmation';
  amount?: number;
  currency?: string;
  concept?: string;
  paymentMethod?: PaymentMethod;
  missingFields: string[];
}

export function parseExpenseMessage(message: string, preferredCurrency: string): ParsedExpenseMessage {
  const trimmed = message.trim();
  const amountMatch = trimmed.match(/(^|[\s(])(?:(CLP|USD|EUR|GBP)\s+)?([$€£])?\s*(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d{1,2})?)(?=$|[\s,.)])/i);
  const amount = amountMatch ? parseLocalizedAmount(amountMatch[4]) : undefined;
  const currency = preferredCurrency;

  const lower = trimmed.toLowerCase();
  const paymentMethod = parsePaymentMethod(lower);
  const concept = amountMatch
    ? cleanConcept(trimmed.replace(amountMatch[0], ''))
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

  const transferBank = extractBank(lowerMessage, [
    /\btransferencia\s+(?:desde|de|por|con)\s+([a-z0-9 -]+)/,
    /\btransfer\s+(?:from|with)\s+([a-z0-9 -]+)/,
    /\b([a-z0-9]+)\s+(?:transferencia|transfer|transf)\b/
  ]);
  if (/\b(transferencia|transfer|transf)\b/.test(lowerMessage)) {
    return { kind: 'transfer', bank: transferBank };
  }

  const cardType = /\b(credit|credito|crédito|tdc|tarjeta de credito|tarjeta de crédito)\b/.test(lowerMessage)
    ? 'credit'
    : /\b(debit|debito|débito|tdd|tarjeta de debito|tarjeta de débito)\b/.test(lowerMessage)
      ? 'debit'
      : undefined;

  if (cardType || /\b(card|tarjeta)\b/.test(lowerMessage)) {
    return {
      kind: 'card',
      cardType,
      bank: extractBank(lowerMessage, [
        /\b(?:tdc|tdd|card|tarjeta|credito|crédito|debito|débito)\s+([a-z0-9 -]+)/,
        /\b(?:bank|banco)\s+([a-z0-9 -]+)/
      ])
    };
  }

  return undefined;
}

function parseLocalizedAmount(value: string) {
  if (/^\d{1,3}(?:[.,]\d{3})+$/.test(value)) {
    return Number(value.replace(/[.,]/g, ''));
  }

  return Number(value.replace(',', '.'));
}

function cleanConcept(value: string) {
  return value
    .replace(/\b(cash|efectivo)\b/gi, '')
    .replace(/\b(transferencia|transfer|transf)\s+(desde|de|por|con)\s+[a-z0-9 -]+/gi, '')
    .replace(/\b[a-z0-9]+\s+(transferencia|transfer|transf)\b/gi, '')
    .replace(/\b(tdc|tdd|card|tarjeta|credito|crédito|debito|débito)\s+[a-z0-9 -]+/gi, '')
    .replace(/\b(credit|debit)\b/gi, '')
    .replace(/\s*,\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function extractBank(lowerMessage: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = lowerMessage.match(pattern);
    const bank = match?.[1]?.replace(/\b(mayo|abril|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|enero|febrero|marzo)\b.*/i, '').trim();
    if (bank) return bank;
  }

  return undefined;
}
