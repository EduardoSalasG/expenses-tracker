import { z } from 'zod';

export const phoneNumberSchema = z.string().min(8).max(20);

export const requestOtpSchema = z.object({
  phoneNumber: phoneNumberSchema
});

export const verifyOtpSchema = z.object({
  phoneNumber: phoneNumberSchema,
  code: z.string().length(6),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  countryOfResidence: z.string().min(2).optional(),
  preferredCurrency: z.string().length(3).default('USD')
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1)
});

export const updateProfileSchema = z.object({
  name: z.string().min(1),
  email: z.union([z.string().email(), z.literal('')]).optional().transform((value) => value || undefined),
  countryOfResidence: z.string().min(2),
  preferredCurrency: z.string().length(3).transform((value) => value.toUpperCase())
});

export const paymentMethodSchema = z.discriminatedUnion('kind', [
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
]);

export const createExpenseSchema = z.object({
  date: z.string().datetime(),
  amount: z.number().positive(),
  currency: z.string().length(3),
  concept: z.string().min(1),
  categoryId: z.string().uuid(),
  subcategoryId: z.string().uuid().optional(),
  paymentMethod: paymentMethodSchema
});

export const expenseQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  categoryId: z.string().uuid().optional(),
  currency: z.string().length(3).transform((value) => value.toUpperCase()).optional(),
  paymentMethodKind: z.enum(['cash', 'card', 'transfer']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50)
});

export const createIncomeSchema = z.object({
  date: z.string().datetime(),
  amount: z.number().positive(),
  currency: z.string().length(3),
  concept: z.string().min(1)
});

export const incomeQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  currency: z.string().length(3).transform((value) => value.toUpperCase()).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50)
});

export const createCategorySchema = z.object({
  name: z.string().min(1),
  parentId: z.string().uuid().optional()
});

export const monthlyBudgetSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  categoryId: z.string().uuid(),
  subcategoryId: z.string().uuid().optional(),
  amount: z.number().positive(),
  currency: z.string().length(3)
});

export const reportPreferencesSchema = z.object({
  preferences: z.array(z.enum(['daily', 'weekly', 'monthly', 'yearly']))
});

export const reportQuerySchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime()
});
