import type { Logger } from 'winston';
import type { MessageInterpreterPort } from '../application/ports.js';
import {
  DeterministicMessageInterpreter,
  interpretedMessageSchema,
  type InterpretedMessage,
  type MessageInterpreterContext
} from '../application/message-interpreter.js';
import type { AppConfig } from './config.js';

export class OpenAiCompatibleMessageInterpreter implements MessageInterpreterPort {
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
        headers: {
          authorization: `Bearer ${this.config.messageInterpreterApiKey}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: this.config.messageInterpreterModel,
          temperature: this.config.messageInterpreterTemperature,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt() },
            {
              role: 'user',
              content: JSON.stringify({
                message,
                user: {
                  countryOfResidence: context.user.countryOfResidence,
                  preferredCurrency: context.user.preferredCurrency
                },
                categories: categoryOptions(context.categories),
                now: context.now.toISOString()
              })
            }
          ]
        })
      });

      if (!response.ok) {
        this.logger.warn('Message interpreter provider failed.', { status: response.status });
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
  if (config.messageInterpreterProvider === 'openai-compatible' || config.messageInterpreterProvider === 'github-models') {
    return new OpenAiCompatibleMessageInterpreter(config, logger);
  }

  return new DeterministicMessageInterpreter();
}

function systemPrompt() {
  return [
    'You interpret WhatsApp messages for a consumer personal finance tracker.',
    'Return only valid JSON. Do not include markdown.',
    'Supported intents: create_expense, create_income, update_movement, ask_report, ask_budget_status, unknown.',
    'Never infer currency from arbitrary words. Currency is tenant configuration, not a message-level input. Omit currency unless the message contains an explicit ISO currency code or currency symbol.',
    'Understand natural Spanish and English personal finance phrases.',
    'Examples: "Ingreso de sueldo 1200000 Bci transferencia" is create_income with amount 1200000 and concept "sueldo".',
    'Examples: "20.000 clases de bachata bsoul mayo, transferencia desde bci" is create_expense with amount 20000, concept "clases de bachata bsoul mayo", paymentMethod transfer, bank "bci".',
    'Examples: "25.000 polera paris, tdc bci" is create_expense with amount 25000, concept "polera paris", paymentMethod card, cardType credit, bank "bci".',
    'For create_expense include amount, concept, paymentMethod, optional categoryName/subcategoryName. paymentMethod must be an object, never a string.',
    'paymentMethod object examples: {"kind":"cash"}, {"kind":"transfer","bank":"bci"}, {"kind":"card","cardType":"credit","bank":"bci"}. For tdc use credit card; for tdd use debit card.',
    'For create_income include amount and concept. Words like sueldo, salario, ingreso, paid, salary indicate income.',
    'For ask_report choose period daily, weekly, monthly, or yearly.',
    'For ask_budget_status include month as YYYY-MM when possible.',
    'For update_movement, extract fields the user wants to change into amount, concept, categoryName, subcategoryName. Use movementType expense or income when stated.',
    'For update_movement, extract the referenced previous movement into referenceAmount, referenceConcept, and referenceCategoryName when the user pasted a previous confirmation or describes the old movement.',
    'Example update: "Cambia la categoría de este gasto a restaurantes Monto: $14.000. Concepto: Hamburguesas. Categoría: Education." means update_movement, movementType expense, categoryName Food, subcategoryName Restaurants, referenceAmount 14000, referenceConcept Hamburguesas, referenceCategoryName Education.',
    'Set needsConfirmation true and missingFields when required data is ambiguous.',
    'Use categoryName and subcategoryName only from the supplied category list when confident.',
    'When a supplied category has subcategories, prefer the most specific matching subcategory.'
  ].join(' ');
}

function categoryOptions(categories: MessageInterpreterContext['categories']) {
  return categories
    .filter((category) => !category.parentId)
    .map((category) => ({
      name: category.name,
      subcategories: categories
        .filter((subcategory) => subcategory.parentId === category.id)
        .map((subcategory) => subcategory.name),
      examples: `${category.name}${categories.some((subcategory) => subcategory.parentId === category.id) ? ` > ${categories
        .filter((subcategory) => subcategory.parentId === category.id)
        .map((subcategory) => subcategory.name)
        .join(', ')}` : ''}`
    }));
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
  const bank = lower.match(/\b(?:desde|de|with|from|banco)?\s*(bci|santander|banco de chile|itau|itaú|scotiabank|falabella|estado)\b/)?.[1];

  if (/\b(transferencia|transfer|transf)\b/.test(lower)) {
    return { kind: 'transfer', bank };
  }

  if (/\b(tdc|credito|crédito|credit)\b/.test(lower)) {
    return { kind: 'card', cardType: 'credit', bank };
  }

  if (/\b(tdd|debito|débito|debit)\b/.test(lower)) {
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
