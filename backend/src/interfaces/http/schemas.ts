import { z } from 'zod';

export const phoneNumberSchema = z.string().min(8).max(20);

export const requestOtpSchema = z.object({
  phoneNumber: phoneNumberSchema,
  telegramChatId: z.string().min(2).optional()
});

export const webRegisterSchema = z.object({
  phoneNumber: phoneNumberSchema,
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  preferredName: z.string().min(1),
  email: z.string().email().optional(),
  countryOfResidence: z.string().min(2),
  preferredCurrency: z.string().length(3).transform((value) => value.toUpperCase()),
  preferredLanguage: z.enum(['es', 'en']).default('es'),
  telegramChatId: z.string().min(2).optional()
});

export const webLoginSchema = z.object({
  phoneNumber: phoneNumberSchema,
  password: z.string().min(8),
  telegramChatId: z.string().min(2).optional()
});

export const requestMagicLinkSchema = z.object({
  phoneNumber: phoneNumberSchema
});

export const consumeMagicLinkSchema = z.object({
  token: z.string().min(10)
});

export const verifyOtpSchema = z.object({
  phoneNumber: phoneNumberSchema,
  code: z.string().length(6),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  preferredName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  countryOfResidence: z.string().min(2).optional(),
  preferredCurrency: z.string().length(3).transform((value) => value.toUpperCase()).optional(),
  preferredLanguage: z.enum(['es', 'en']).optional(),
  telegramChatId: z.string().min(2).optional()
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1)
});

export const createTelegramLinkTokenSchema = z.object({
  chatId: z.string().min(2)
});

export const createTelegramRegistrationLinkSchema = z.object({
  phoneNumber: phoneNumberSchema
});

export const consumeTelegramLinkTokenSchema = z.object({
  token: z.string().min(10)
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  preferredName: z.string().min(1),
  email: z.union([z.string().email(), z.literal('')]).optional().transform((value) => value || undefined),
  countryOfResidence: z.string().min(2),
  preferredCurrency: z.string().length(3).transform((value) => value.toUpperCase()),
  preferredLanguage: z.enum(['es', 'en']).default('es')
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

export const bankOptionSchema = z.object({
  name: z.string().min(1)
});

export const updateBankOptionSchema = bankOptionSchema;

export const paymentMethodOptionSchema = z.object({
  name: z.string().min(1),
  kind: z.enum(['cash', 'card', 'transfer']),
  cardType: z.enum(['credit', 'debit']).optional()
}).superRefine((value, ctx) => {
  if (value.kind !== 'card' && value.cardType) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'cardType is only valid for card payment methods.',
      path: ['cardType']
    });
  }
});

export const updatePaymentMethodOptionSchema = paymentMethodOptionSchema;

export const createExpenseSchema = z.object({
  date: z.string().datetime(),
  amount: z.number().positive(),
  currency: z.string().length(3),
  concept: z.string().min(1),
  categoryId: z.string().uuid(),
  subcategoryId: z.string().uuid().optional(),
  paymentMethodOptionId: z.string().uuid().optional(),
  bankOptionId: z.string().uuid().optional(),
  installmentCount: z.number().int().min(1).max(60).default(1),
  firstInstallmentDate: z.string().datetime().optional(),
  paymentMethod: paymentMethodSchema
});

export const updateExpenseSchema = createExpenseSchema;

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

export const updateIncomeSchema = createIncomeSchema;

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

export const reportYearQuerySchema = z.object({
  year: z.coerce.number().int().min(1970).max(9999)
});

export const reportMonthQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/)
});

export const reportWeekStartQuerySchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});
