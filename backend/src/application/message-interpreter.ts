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
        kind: z.literal('transfer'),
        bank: z.string().min(1).optional()
      }),
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
      ...inferCategoryFromText(context.categories, message),
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

export function inferCategoryFromText(categories: Category[], text: string) {
  const normalized = normalizeName(text);
  const exactSubcategory = categories
    .filter((category) => category.parentId)
    .find((category) => tokenIncludes(normalized, normalizeName(category.name)));
  if (exactSubcategory) {
    const parent = categories.find((category) => category.id === exactSubcategory.parentId);
    return {
      categoryName: parent?.name,
      subcategoryName: exactSubcategory.name
    };
  }

  const exactRoot = categories
    .filter((category) => !category.parentId)
    .find((category) => tokenIncludes(normalized, normalizeName(category.name)));
  if (exactRoot) {
    return { categoryName: exactRoot.name };
  }

  for (const rule of CATEGORY_INFERENCE_RULES) {
    if (rule.pattern.test(normalized)) {
      const matched = categoryByInterpretedName(categories, rule.categoryName, rule.subcategoryName);
      if (matched.category) {
        return {
          categoryName: matched.category.name,
          subcategoryName: matched.subcategory?.name
        };
      }
    }
  }

  return {};
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

function tokenIncludes(text: string, token: string) {
  return new RegExp(`\\b${escapeRegExp(token)}\\b`).test(text);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const CATEGORY_INFERENCE_RULES = [
  { pattern: /\b(grocery|groceries|supermercado|mercado|verduleria|verduleria|almacen|almacen|panaderia|panaderia)\b/, categoryName: 'Food', subcategoryName: 'Groceries' },
  { pattern: /\b(restaurante|restaurant|cafe|cafeteria|cafeteria|bar|comida|almuerzo|cena|desayuno)\b/, categoryName: 'Food', subcategoryName: 'Restaurants' },
  { pattern: /\b(uber|cabify|didi)\b/, categoryName: 'Transport', subcategoryName: 'Uber' },
  { pattern: /\b(metro|micro|bus|transporte publico|public transport|bip)\b/, categoryName: 'Transport', subcategoryName: 'Public Transport' },
  { pattern: /\b(arriendo|renta|rent|dividendo)\b/, categoryName: 'Housing', subcategoryName: 'Rent' },
  { pattern: /\b(remedio|medicina|medicamento|farmacia|medicine|pharmacy)\b/, categoryName: 'Health', subcategoryName: 'Medicines' },
  { pattern: /\b(doctor|medico|medico|consulta|appointment|cita)\b/, categoryName: 'Health', subcategoryName: 'Appointments' },
  { pattern: /\b(examen|procedimiento|procedure|procedures)\b/, categoryName: 'Health', subcategoryName: 'Procedures' },
  { pattern: /\b(gimnasio|gym|deporte|sports|sport)\b/, categoryName: 'Health', subcategoryName: 'Sports' },
  { pattern: /\b(clase|clases|curso|academia|taller|bachata|salsa|dance class)\b/, categoryName: 'Education', subcategoryName: 'Dance' },
  { pattern: /\b(teatro|theater|cine|concierto|show)\b/, categoryName: 'Entertainment', subcategoryName: 'Theater' },
  { pattern: /\b(telefono|phone|celular|internet|plan)\b/, categoryName: 'Services', subcategoryName: 'Phone' },
  { pattern: /\b(regalo|gift|gifts)\b/, categoryName: 'Other', subcategoryName: 'Gifts' }
];

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
