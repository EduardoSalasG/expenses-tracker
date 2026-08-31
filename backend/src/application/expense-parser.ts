import type { PaymentMethod } from '../domain/index.js';

export interface ParsedExpenseMessage {
  status: 'ready' | 'needs_confirmation';
  amount?: number;
  currency?: string;
  concept?: string;
  installmentCount?: number;
  firstInstallmentDate?: string;
  paymentMethod?: PaymentMethod;
  missingFields: string[];
}

export function parseExpenseMessage(message: string, preferredCurrency: string, now = new Date()): ParsedExpenseMessage {
  const trimmed = message.trim();
  const amountMatch = trimmed.match(/(^|[\s(])(?:(CLP|USD|EUR|GBP)\s+)?([$€£])?\s*(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d{1,2})?)(?=$|[\s,.)])/i);
  const amount = amountMatch ? parseLocalizedAmount(amountMatch[4]) : undefined;
  const currency = preferredCurrency;
  const installmentCount = parseInstallmentCount(trimmed);
  const firstInstallmentDate = parseFirstInstallmentDate(trimmed, now);

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
    installmentCount,
    firstInstallmentDate,
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
    : /\b(debit|debito|débito|tdd|td|tarjeta de debito|tarjeta de débito)\b/.test(lowerMessage)
      ? 'debit'
      : undefined;
  const normalizedCardType = cardType
    ?? (/\b(tc)\b/.test(lowerMessage) ? 'credit' : /\b(td)\b/.test(lowerMessage) ? 'debit' : undefined);

  if (normalizedCardType || /\b(card|tarjeta)\b/.test(lowerMessage)) {
    return {
      kind: 'card',
      cardType: normalizedCardType,
      bank: extractBank(lowerMessage, [
        /\b(?:tdc|tc|tdd|td|card|tarjeta|credito|crédito|debito|débito)\s+([a-z0-9 -]+)/,
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
    .replace(/\b(tdc|tc|tdd|td|card|tarjeta|credito|crédito|debito|débito)\s+[a-z0-9 -]+/gi, '')
    .replace(/\b(credit|debit)\b/gi, '')
    .replace(/\b\d+\s*(cuotas|cuota|installments?|meses?)\b/gi, '')
    .replace(/\b(en|a)\s+\d+\s*(cuotas|cuota|installments?)\b/gi, '')
    .replace(/\b(?:primera\s+(?:cuota|fecha(?:\s+de\s+cobro)?)|first\s+(?:installment|charge(?:\s+date)?))\s*(?:es|el|on|:)?\s*\d{4}-\d{2}-\d{2}\b/gi, '')
    .replace(/\b(?:primera\s+(?:cuota|fecha(?:\s+de\s+cobro)?)|first\s+(?:installment|charge(?:\s+date)?))\s*(?:es|el|on|:)?\s*\d{1,2}\s+(?:de\s+)?[a-záéíóú]+(?:\s+(?:de\s+)?\d{4})?\b/gi, '')
    .replace(/\s*,\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function parseFirstInstallmentDate(message: string, now: Date) {
  const isoMatch = message.match(/\b(?:primera\s+(?:cuota|fecha(?:\s+de\s+cobro)?)|first\s+(?:installment|charge(?:\s+date)?))\s*(?:es|el|on|:)?\s*(\d{4}-\d{2}-\d{2})\b/i);
  if (isoMatch?.[1]) return isValidIsoDate(isoMatch[1]) ? isoMatch[1] : undefined;

  const namedDateMatch = message.match(/\b(?:primera\s+(?:cuota|fecha(?:\s+de\s+cobro)?)|first\s+(?:installment|charge(?:\s+date)?))\s*(?:es|el|on|:)?\s*(\d{1,2})\s+(?:de\s+)?([a-záéíóú]+)(?:\s+(?:de\s+)?(\d{4}))?\b/i);
  if (!namedDateMatch) return undefined;

  const day = Number(namedDateMatch[1]);
  const month = monthNumber(namedDateMatch[2]);
  if (!month || day < 1 || day > 31) return undefined;
  const currentYear = now.getUTCFullYear();
  let year = namedDateMatch[3] ? Number(namedDateMatch[3]) : currentYear;
  let date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return undefined;
  if (!namedDateMatch[3] && date < startOfUtcDay(now)) {
    year += 1;
    date = new Date(Date.UTC(year, month - 1, day));
  }
  return date.toISOString().slice(0, 10);
}

function monthNumber(value: string) {
  const normalized = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return {
    january: 1, enero: 1,
    february: 2, febrero: 2,
    march: 3, marzo: 3,
    april: 4, abril: 4,
    may: 5, mayo: 5,
    june: 6, junio: 6,
    july: 7, julio: 7,
    august: 8, agosto: 8,
    september: 9, septiembre: 9,
    october: 10, octubre: 10,
    november: 11, noviembre: 11,
    december: 12, diciembre: 12
  }[normalized];
}

function isValidIsoDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function startOfUtcDay(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function parseInstallmentCount(message: string) {
  const match = message.match(/\b(?:en\s+)?(\d{1,2})\s*(cuotas|cuota|installments?|months?)\b/i)
    ?? message.match(/\b(\d{1,2})x\b/i);
  if (!match) return 1;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function extractBank(lowerMessage: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = lowerMessage.match(pattern);
    const bank = match?.[1]?.replace(/\b(mayo|abril|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|enero|febrero|marzo)\b.*/i, '').trim();
    if (bank) return bank;
  }

  return undefined;
}
