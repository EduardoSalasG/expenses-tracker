import { z } from 'zod';
import type { Category, PaymentMethod, ReportFrequency, User } from '../domain/types.js';
import { parseExpenseMessage } from './expense-parser.js';

export const interpretedMessageSchema = z.discriminatedUnion('intent', [
  z.object({
    intent: z.literal('create_expense'),
    confidence: z.number().min(0).max(1).default(0.5),
    amount: z.number().positive().optional(),
    currency: z.string().length(3).optional(),
    concept: z.string().min(1).optional(),
    categoryName: z.string().min(1).optional(),
    subcategoryName: z.string().min(1).optional(),
    paymentMethod: z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('cash') }),
      z.object({
        kind: z.literal('card'),
        bank: z.string().min(1).optional(),
        cardType: z.enum(['credit', 'debit']).optional()
      })
    ]).optional(),
    missingFields: z.array(z.string()).default([]),
    needsConfirmation: z.boolean().default(false)
  }),
  z.object({
    intent: z.literal('create_income'),
    confidence: z.number().min(0).max(1).default(0.5),
    amount: z.number().positive().optional(),
    currency: z.string().length(3).optional(),
    concept: z.string().min(1).optional(),
    missingFields: z.array(z.string()).default([]),
    needsConfirmation: z.boolean().default(false)
  }),
  z.object({
    intent: z.literal('ask_report'),
    confidence: z.number().min(0).max(1).default(0.5),
    period: z.enum(['daily', 'weekly', 'monthly', 'yearly']).default('monthly'),
    categoryName: z.string().min(1).optional()
  }),
  z.object({
    intent: z.literal('ask_budget_status'),
    confidence: z.number().min(0).max(1).default(0.5),
    month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
    categoryName: z.string().min(1).optional()
  }),
  z.object({
    intent: z.literal('unknown'),
    confidence: z.number().min(0).max(1).default(0),
    reason: z.string().optional()
  })
]);

export type InterpretedMessage = z.infer<typeof interpretedMessageSchema>;

export interface MessageInterpreterContext {
  user: User;
  categories: Category[];
  now: Date;
}

export class DeterministicMessageInterpreter {
  async interpret(message: string, context: MessageInterpreterContext): Promise<InterpretedMessage> {
    const lower = message.trim().toLowerCase();

    if (/\b(income|salary|sueldo|salario|pago|paid|me pagaron|recibi|recibí)\b/.test(lower)) {
      return parseIncome(message, context.user.preferredCurrency);
    }

    if (/\b(report|reporte|resumen|summary)\b/.test(lower) || /\b(cu[aá]nto|how much|spent|gastado|gaste|gast[eé])\b/.test(lower)) {
      if (/\b(budget|presupuesto)\b/.test(lower)) {
        return { intent: 'ask_budget_status', confidence: 0.75, month: monthFromDate(context.now) };
      }

      return {
        intent: 'ask_report',
        confidence: 0.75,
        period: periodFromMessage(lower)
      };
    }

    const parsed = parseExpenseMessage(message, context.user.preferredCurrency);
    return {
      intent: 'create_expense',
      confidence: parsed.status === 'ready' ? 0.75 : 0.45,
      amount: parsed.amount,
      currency: parsed.currency,
      concept: parsed.concept,
      paymentMethod: parsed.paymentMethod,
      missingFields: parsed.missingFields,
      needsConfirmation: parsed.status !== 'ready'
    };
  }
}

function parseIncome(message: string, preferredCurrency: string): InterpretedMessage {
  const parsed = parseExpenseMessage(message, preferredCurrency);
  const concept = parsed.concept
    ?.replace(/\b(income|salary|sueldo|salario|pago|paid|me pagaron|recibi|recibí)\b/gi, '')
    .trim() || 'Income';
  const missingFields = [
    parsed.amount === undefined ? 'amount' : undefined,
    concept.length === 0 ? 'concept' : undefined
  ].filter((field): field is string => Boolean(field));

  return {
    intent: 'create_income',
    confidence: missingFields.length ? 0.45 : 0.75,
    amount: parsed.amount,
    currency: parsed.currency,
    concept,
    missingFields,
    needsConfirmation: missingFields.length > 0
  };
}

function periodFromMessage(message: string): ReportFrequency {
  if (/\b(today|hoy|daily|diario|d[ií]a)\b/.test(message)) return 'daily';
  if (/\b(week|weekly|semana|semanal)\b/.test(message)) return 'weekly';
  if (/\b(year|yearly|año|ano|anual)\b/.test(message)) return 'yearly';
  return 'monthly';
}

function monthFromDate(date: Date) {
  return date.toISOString().slice(0, 7);
}

export function categoryByInterpretedName(
  categories: Category[],
  categoryName?: string,
  subcategoryName?: string
) {
  const rootCategory = findCategory(categories, categoryName, false);
  const subcategory = subcategoryName
    ? findCategory(categories.filter((category) => !rootCategory || category.parentId === rootCategory.id), subcategoryName)
    : undefined;
  return {
    category: rootCategory ?? (subcategory?.parentId ? categories.find((category) => category.id === subcategory.parentId) : undefined),
    subcategory
  };
}

function findCategory(categories: Category[], name?: string, allowSubcategory = true) {
  if (!name) return undefined;
  const normalized = normalizeName(name);
  return categories.find((category) =>
    (allowSubcategory || !category.parentId) &&
    normalizeName(category.name) === normalized
  );
}

function normalizeName(value: string) {
  return value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function isCompleteExpense(intent: InterpretedMessage): intent is Extract<InterpretedMessage, { intent: 'create_expense' }> & {
  amount: number;
  concept: string;
  paymentMethod: PaymentMethod;
} {
  return intent.intent === 'create_expense' && Boolean(intent.amount && intent.concept && intent.paymentMethod && !intent.needsConfirmation);
}

export function isCompleteIncome(intent: InterpretedMessage): intent is Extract<InterpretedMessage, { intent: 'create_income' }> & {
  amount: number;
  concept: string;
} {
  return intent.intent === 'create_income' && Boolean(intent.amount && intent.concept && !intent.needsConfirmation);
}
