import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AppConfig } from './config.js';
import type { MessageInterpreterContext } from '../application/message-interpreter.js';
import { ChatCompletionsMessageInterpreter } from './message-interpreter.provider.js';

afterEach(() => vi.unstubAllGlobals());

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

const config = {
  messageInterpreterProvider: 'openai-compatible', messageInterpreterApiKey: 'test-key',
  messageInterpreterBaseUrl: 'https://example.test/v1', messageInterpreterModel: 'test-model',
  messageInterpreterTemperature: 0.1
} as AppConfig;
const logger = { warn: vi.fn() } as never;

describe('ChatCompletionsMessageInterpreter', () => {
  it('sends accessible accounts and instructions for creation without historical data', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ intent: 'create_expense', amount: 25000, concept: 'supermercado', accountName: 'Hogar' }) } }]
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await new ChatCompletionsMessageInterpreter(config, logger)
      .interpret('25000 supermercado, debito, 3 cuotas, cuenta Hogar', context);
    const payload = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body));
    const userInput = JSON.parse(payload.messages.at(-1).content);
    const instructions = `${payload.messages[0].content} ${userInput.outputContract.notes.join(' ')}`;

    expect(result).toMatchObject({ intent: 'create_expense', accountName: 'Hogar' });
    expect(userInput.financialAccounts).toEqual([{ name: 'Personal', type: 'personal' }, { name: 'Hogar', type: 'shared' }]);
    expect(instructions).toMatch(/create_expense.*accountName|accountName.*create_expense/i);
    expect(instructions).toMatch(/do not invent (?:financial )?accounts/i);
    expect(instructions).toMatch(/expense date.*YYYY-MM-DD/i);
    expect(JSON.stringify(payload)).not.toMatch(/historicalMessages|historicalTransactions|transactionHistory/);
    expect(payload.messages.filter((entry: { role: string }) => entry.role === 'assistant')
      .some((entry: { content: string }) => JSON.parse(entry.content).accountName === 'Hogar')).toBe(true);
  });

  it('uses deterministic fallback when the provider returns invalid data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: '{"intent":"create_expense","amount":-1}' } }]
    }), { status: 200 })));

    const result = await new ChatCompletionsMessageInterpreter(config, logger)
      .interpret('25000 supermercado, debito, 3 cuotas, cuenta Hogar', context);

    expect(result).toMatchObject({ intent: 'create_expense', accountName: 'Hogar', concept: 'supermercado', installmentCount: 3 });
  });

  it('does not accept a supplied account invented by the provider', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({
        intent: 'create_expense', amount: 25000, concept: 'supermercado', accountName: 'Hogar'
      }) } }]
    }), { status: 200 })));

    const result = await new ChatCompletionsMessageInterpreter(config, logger)
      .interpret('25000 supermercado, debito', context);

    expect(result).toMatchObject({ intent: 'create_expense', accountName: undefined });
  });

  it('sends localized category labels while preserving canonical references', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ intent: 'create_expense' }) } }]
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await new ChatCompletionsMessageInterpreter(config, logger).interpret('12.000 almuerzo efectivo', {
      ...context,
      user: { ...context.user, preferredLanguage: 'es' },
      categories: [{ id: 'food', tenantId: 'tenant-1', name: 'Food', nameEs: 'Comida', nameEn: 'Food', isDefault: true }]
    });
    const payload = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body));
    const userInput = JSON.parse(payload.messages.at(-1).content);

    expect(userInput.categories[0]).toMatchObject({ name: 'Comida', canonicalName: 'Food' });
  });
});
