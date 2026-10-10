import { describe, expect, it } from 'vitest';
import { categoryByInterpretedName, DeterministicMessageInterpreter, inferCategoryCandidateFromText, interpretedMessageSchema, type MessageInterpreterContext } from './message-interpreter.js';

describe('localized category aliases', () => {
  const categories = [
    { id: 'education', tenantId: 'tenant-1', name: 'Education', nameEs: 'Educación', nameEn: 'Education', isDefault: true },
    { id: 'dance', tenantId: 'tenant-1', name: 'Dance', nameEs: 'Baile', nameEn: 'Dance', parentId: 'education', isDefault: false }
  ];

  it('resolves a Spanish alias to the canonical custom category', () => {
    const match = categoryByInterpretedName(categories, 'Educación', 'Baile');

    expect(match.category).toMatchObject({ id: 'education', name: 'Education' });
    expect(match.subcategory).toMatchObject({ id: 'dance', name: 'Dance' });
  });

  it('infers a localized subcategory alias from free text', () => {
    expect(inferCategoryCandidateFromText(categories, 'Pago de baile')).toMatchObject({
      categoryName: 'Education',
      subcategoryName: 'Dance',
      source: 'exact_subcategory'
    });
  });
});

const context: MessageInterpreterContext = {
  user: {
    id: 'user-1', tenantId: 'tenant-1', phoneNumber: '+56912345678', firstName: 'Ana', lastName: 'López',
    preferredName: 'Ana', role: 'consumer', countryOfResidence: 'CL', preferredCurrency: 'CLP', reportPreferences: []
  },
  categories: [], banks: [], paymentMethodOptions: [],
  availableFinancialAccounts: [
    { id: 'personal', name: 'Personal', type: 'personal' },
    { id: 'home', name: 'Hogar', type: 'shared' }
  ],
  now: new Date('2026-10-09T12:00:00.000Z')
};

describe('inline financial account interpretation', () => {
  const interpreter = new DeterministicMessageInterpreter();

  it('routes an expense to its unique accessible account without retaining the clause in the concept', async () => {
    const result = await interpreter.interpret('25000 supermercado, debito, 3 cuotas, cuenta Hogar', context);

    expect(result).toMatchObject({
      intent: 'create_expense', accountName: 'Hogar', amount: 25000,
      concept: 'supermercado', installmentCount: 3,
      paymentMethod: { kind: 'card', cardType: 'debit' }
    });
  });

  it('accepts an English account clause on income', async () => {
    const result = await interpreter.interpret('Me pagaron bono 1200000, account hogar', context);

    expect(result).toMatchObject({ intent: 'create_income', accountName: 'Hogar', concept: 'bono' });
  });

  it('does not select an inaccessible or ambiguous account', async () => {
    const inaccessible = await interpreter.interpret('25000 supermercado, debito, cuenta Viajes', context);
    const ambiguous = await interpreter.interpret('25000 supermercado, debito, cuenta hogar', {
      ...context,
      availableFinancialAccounts: [...context.availableFinancialAccounts, { id: 'duplicate', name: 'Hógar', type: 'shared' }]
    });

    expect(inaccessible).toMatchObject({ intent: 'create_expense', accountName: undefined });
    expect(ambiguous).toMatchObject({ intent: 'create_expense', accountName: undefined });
    expect(inaccessible.intent === 'create_expense' && inaccessible.concept).toContain('cuenta Viajes');
  });

  it('validates optional account names on creation intents', () => {
    expect(interpretedMessageSchema.parse({ intent: 'create_expense', accountName: 'Hogar' })).toHaveProperty('accountName', 'Hogar');
    expect(interpretedMessageSchema.parse({ intent: 'create_income', accountName: 'Hogar' })).toHaveProperty('accountName', 'Hogar');
    expect(interpretedMessageSchema.safeParse({ intent: 'create_expense', accountName: '' }).success).toBe(false);
  });

  it('preserves a concept containing debit wording when cash is the payment method', async () => {
    const result = await interpreter.interpret('25000 tarifa débito, efectivo', context);

    expect(result).toMatchObject({ intent: 'create_expense', concept: 'tarifa débito', paymentMethod: { kind: 'cash' } });
  });
});
