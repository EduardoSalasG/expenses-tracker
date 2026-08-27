import type { Logger } from 'winston';
import type { MessageInterpreterPort } from '../application/ports.js';
import {
  DeterministicMessageInterpreter,
  interpretedMessageSchema,
  type InterpretedMessage,
  type MessageInterpreterContext
} from '../application/message-interpreter.js';
import type { AppConfig } from './config.js';

export class ChatCompletionsMessageInterpreter implements MessageInterpreterPort {
  private readonly fallback = new DeterministicMessageInterpreter();

  constructor(
    private readonly config: AppConfig,
    private readonly logger: Logger
  ) {}

  async interpret(message: string, context: MessageInterpreterContext): Promise<InterpretedMessage> {
    if (!this.config.messageInterpreterApiKey) {
      return this.fallback.interpret(message, context);
    }

    try {
      const response = await fetch(`${this.config.messageInterpreterBaseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: buildInterpreterHeaders(this.config),
        body: JSON.stringify(buildChatCompletionPayload(this.config, message, context))
      });

      if (!response.ok) {
        this.logger.warn('Message interpreter provider failed.', {
          status: response.status,
          body: await safeJson(response)
        });
        return this.fallback.interpret(message, context);
      }

      const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      const content = payload.choices?.[0]?.message?.content;
      if (!content) {
        return this.fallback.interpret(message, context);
      }

      return interpretedMessageSchema.parse(normalizeInterpretedPayload(JSON.parse(extractJson(content))));
    } catch (error) {
      this.logger.warn('Message interpreter fallback used.', { error });
      return this.fallback.interpret(message, context);
    }
  }
}

export function createMessageInterpreter(config: AppConfig, logger: Logger): MessageInterpreterPort {
  if (
    config.messageInterpreterProvider === 'openai-compatible' ||
    config.messageInterpreterProvider === 'openrouter' ||
    config.messageInterpreterProvider === 'github-models'
  ) {
    return new ChatCompletionsMessageInterpreter(config, logger);
  }

  return new DeterministicMessageInterpreter();
}

function buildInterpreterHeaders(config: AppConfig) {
  const headers: Record<string, string> = {
    authorization: `Bearer ${config.messageInterpreterApiKey}`,
    'content-type': 'application/json'
  };

  if (config.messageInterpreterProvider === 'openrouter') {
    const referer = config.messageInterpreterHttpReferer || config.frontendPublicOrigin;
    if (referer) headers['HTTP-Referer'] = referer;
    if (config.messageInterpreterAppName) headers['X-Title'] = config.messageInterpreterAppName;
  }

  return headers;
}

function buildChatCompletionPayload(config: AppConfig, message: string, context: MessageInterpreterContext) {
  return {
    model: config.messageInterpreterModel,
    temperature: config.messageInterpreterTemperature,
    messages: [
      { role: 'system', content: systemPrompt() },
      ...fewShotMessages(context),
      {
        role: 'user',
        content: JSON.stringify({
          task: 'interpret_finance_message',
          inputMessage: message,
          user: {
            countryOfResidence: context.user.countryOfResidence,
            preferredCurrency: context.user.preferredCurrency,
            preferredLanguage: context.user.preferredLanguage
          },
          categories: categoryOptions(context.categories),
          banks: bankOptions(context.banks),
          paymentMethodOptions: paymentMethodOptions(context.paymentMethodOptions),
          financialAccounts: financialAccountOptions(context.availableFinancialAccounts),
          now: context.now.toISOString(),
          outputContract: {
            returnOnlyJson: true,
            allowedIntents: [
              'create_expense',
              'create_income',
              'update_movement',
              'ask_report',
              'ask_budget_status',
              'unknown'
            ],
            notes: [
              'Preserve the concept exactly as the user wrote it whenever possible.',
              'Do not invent banks, categories, or subcategories outside the supplied options.',
              'If a field is uncertain, omit it, add it to missingFields when relevant, and set needsConfirmation true.'
            ]
          }
        })
      }
    ]
  };
}

function systemPrompt() {
  return [
    'You interpret direct user messages for a personal finance tracker.',
    'Return only valid JSON and no markdown, comments, prose, or fences.',
    'Supported intents: create_expense, create_income, update_movement, ask_report, ask_budget_status, unknown.',
    'Think silently and return the final JSON only.',
    'Preserve the original concept wording. Do not shorten, rewrite, translate, or normalize the concept unless the user explicitly asked to update it.',
    'The user currency is tenant-level configuration. Do not infer a different currency from arbitrary words like "sueldo", "mayo", or merchant names.',
    'Only set currency when the message includes an explicit ISO code or unmistakable symbol.',
    'Use categoryName and subcategoryName only from the supplied category list.',
    'When a supplied category has subcategories, choose the most specific valid match available.',
    'Use payment methods only from the supplied paymentMethodOptions. Normalize informal phrases like tdc to credit card, tdd to debit card, transferencia to transfer, efectivo to cash.',
    'Use banks only from the supplied bank list. Match abbreviations and aliases conservatively, for example BCI to Banco de Credito e Inversiones.',
    'If the bank is not clearly stated or no supplied bank matches, omit bank.',
    'For ask_report and ask_budget_status only, set accountName only when the user explicitly refers to one of the supplied financialAccounts. Use the exact supplied name. Otherwise omit accountName.',
    'Recognize installments or cuotas. If the user says "3 cuotas", set installmentCount to 3. If not stated, default installmentCount to 1 for expenses.',
    'For update_movement, extract both the requested changes and the referenced original movement fields when present.',
    'If information is missing or ambiguous for a create or update intent, set needsConfirmation true and populate missingFields with concise field identifiers.'
  ].join(' ');
}

function fewShotMessages(context: MessageInterpreterContext) {
  const categoryPayload = categoryOptions(context.categories);
  const bankPayload = bankOptions(context.banks);
  const paymentPayload = paymentMethodOptions(context.paymentMethodOptions);
  const financialAccountPayload = financialAccountOptions(context.availableFinancialAccounts);

  return [
    {
      role: 'user',
      content: JSON.stringify({
        task: 'interpret_finance_message',
        inputMessage: '20.000 clases de bachata bsoul mayo, transferencia desde bci',
        user: {
          countryOfResidence: context.user.countryOfResidence,
          preferredCurrency: context.user.preferredCurrency,
          preferredLanguage: context.user.preferredLanguage
        },
        categories: categoryPayload,
        banks: bankPayload,
        paymentMethodOptions: paymentPayload,
        financialAccounts: financialAccountPayload,
        now: context.now.toISOString()
      })
    },
    {
      role: 'assistant',
      content: JSON.stringify({
        intent: 'create_expense',
        confidence: 0.96,
        amount: 20000,
        concept: 'clases de bachata bsoul mayo',
        installmentCount: 1,
        categoryName: 'Education',
        subcategoryName: 'Dance',
        paymentMethod: {
          kind: 'transfer',
          bank: 'Banco de Crédito e Inversiones'
        },
        missingFields: [],
        needsConfirmation: false
      })
    },
    {
      role: 'user',
      content: JSON.stringify({
        task: 'interpret_finance_message',
        inputMessage: '25.000 polera paris, tdc bci, 3 cuotas',
        user: {
          countryOfResidence: context.user.countryOfResidence,
          preferredCurrency: context.user.preferredCurrency,
          preferredLanguage: context.user.preferredLanguage
        },
        categories: categoryPayload,
        banks: bankPayload,
        paymentMethodOptions: paymentPayload,
        financialAccounts: financialAccountPayload,
        now: context.now.toISOString()
      })
    },
    {
      role: 'assistant',
      content: JSON.stringify({
        intent: 'create_expense',
        confidence: 0.93,
        amount: 25000,
        concept: 'polera paris',
        installmentCount: 3,
        categoryName: 'Clothing',
        subcategoryName: 'Clothes',
        paymentMethod: {
          kind: 'card',
          cardType: 'credit',
          bank: 'Banco de Crédito e Inversiones'
        },
        missingFields: [],
        needsConfirmation: false
      })
    },
    {
      role: 'user',
      content: JSON.stringify({
        task: 'interpret_finance_message',
        inputMessage: 'Ingreso de sueldo 1200000 bci transferencia',
        user: {
          countryOfResidence: context.user.countryOfResidence,
          preferredCurrency: context.user.preferredCurrency,
          preferredLanguage: context.user.preferredLanguage
        },
        categories: categoryPayload,
        banks: bankPayload,
        paymentMethodOptions: paymentPayload,
        financialAccounts: financialAccountPayload,
        now: context.now.toISOString()
      })
    },
    {
      role: 'assistant',
      content: JSON.stringify({
        intent: 'create_income',
        confidence: 0.95,
        amount: 1200000,
        concept: 'sueldo',
        missingFields: [],
        needsConfirmation: false
      })
    },
    {
      role: 'user',
      content: JSON.stringify({
        task: 'interpret_finance_message',
        inputMessage: 'Cambia la categoría de este gasto a restaurantes\nMonto: $14.000.\nConcepto: Hamburguesas.\nCategoría: Education.',
        user: {
          countryOfResidence: context.user.countryOfResidence,
          preferredCurrency: context.user.preferredCurrency,
          preferredLanguage: context.user.preferredLanguage
        },
        categories: categoryPayload,
        banks: bankPayload,
        paymentMethodOptions: paymentPayload,
        financialAccounts: financialAccountPayload,
        now: context.now.toISOString()
      })
    },
    {
      role: 'assistant',
      content: JSON.stringify({
        intent: 'update_movement',
        confidence: 0.9,
        movementType: 'expense',
        categoryName: 'Food',
        subcategoryName: 'Restaurants',
        referenceAmount: 14000,
        referenceConcept: 'Hamburguesas',
        referenceCategoryName: 'Education',
        missingFields: [],
        needsConfirmation: false
      })
    },
    {
      role: 'user',
      content: JSON.stringify({
        task: 'interpret_finance_message',
        inputMessage: '¿Cuánto he gastado este mes en la cuenta de Casa común?',
        financialAccounts: financialAccountPayload,
        now: context.now.toISOString()
      })
    },
    {
      role: 'assistant',
      content: JSON.stringify({
        intent: 'ask_report',
        confidence: 0.95,
        period: 'monthly',
        accountName: 'Casa común'
      })
    }
  ];
}

function categoryOptions(categories: MessageInterpreterContext['categories']) {
  return categories
    .filter((category) => !category.parentId)
    .map((category) => ({
      name: category.name,
      subcategories: categories
        .filter((subcategory) => subcategory.parentId === category.id)
        .map((subcategory) => subcategory.name)
    }));
}

function bankOptions(banks: MessageInterpreterContext['banks']) {
  return banks.map((bank) => bank.name);
}

function paymentMethodOptions(options: MessageInterpreterContext['paymentMethodOptions']) {
  return options.map((option) => ({
    name: option.name,
    kind: option.kind,
    cardType: option.cardType
  }));
}

function financialAccountOptions(accounts: MessageInterpreterContext['availableFinancialAccounts']) {
  return accounts.map((account) => ({ name: account.name, type: account.type }));
}

function extractJson(content: string) {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenced?.[1]?.trim() ?? trimmed;
}

function normalizeInterpretedPayload(payload: unknown) {
  if (!payload || typeof payload !== 'object') return payload;
  const normalized = { ...(payload as Record<string, unknown>) };

  if (typeof normalized.paymentMethod === 'string') {
    normalized.paymentMethod = paymentMethodFromText(normalized.paymentMethod);
  }

  return normalized;
}

function paymentMethodFromText(value: string) {
  const lower = value.toLowerCase();
  const bank = lower.match(/\b(?:desde|de|with|from|banco)?\s*(bci|bancoestado|banco estado|be|santander|banco de chile|itau|itaú|scotiabank|falabella|estado)\b/)?.[1];

  if (/\b(transferencia|transfer|transf)\b/.test(lower)) {
    return { kind: 'transfer', bank };
  }

  if (/\b(tdc|tc|credito|crédito|credit)\b/.test(lower)) {
    return { kind: 'card', cardType: 'credit', bank };
  }

  if (/\b(tdd|td|debito|débito|debit)\b/.test(lower)) {
    return { kind: 'card', cardType: 'debit', bank };
  }

  if (/\b(card|tarjeta)\b/.test(lower)) {
    return { kind: 'card', bank };
  }

  if (/\b(cash|efectivo)\b/.test(lower)) {
    return { kind: 'cash' };
  }

  return value;
}

async function safeJson(response: Response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
