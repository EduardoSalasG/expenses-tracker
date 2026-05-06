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
                categories: context.categories.map((category) => ({
                  name: category.name,
                  parentId: category.parentId
                })),
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

      return interpretedMessageSchema.parse(JSON.parse(extractJson(content)));
    } catch (error) {
      this.logger.warn('Message interpreter fallback used.', { error });
      return this.fallback.interpret(message, context);
    }
  }
}

export function createMessageInterpreter(config: AppConfig, logger: Logger): MessageInterpreterPort {
  if (config.messageInterpreterProvider === 'openai-compatible') {
    return new OpenAiCompatibleMessageInterpreter(config, logger);
  }

  return new DeterministicMessageInterpreter();
}

function systemPrompt() {
  return [
    'You interpret WhatsApp messages for a consumer personal finance tracker.',
    'Return only valid JSON. Do not include markdown.',
    'Supported intents: create_expense, create_income, ask_report, ask_budget_status, unknown.',
    'Use the user preferred currency when no explicit currency is present.',
    'For create_expense include amount, currency, concept, paymentMethod, optional categoryName/subcategoryName.',
    'For create_income include amount, currency, and concept.',
    'For ask_report choose period daily, weekly, monthly, or yearly.',
    'For ask_budget_status include month as YYYY-MM when possible.',
    'Set needsConfirmation true and missingFields when required data is ambiguous.',
    'Use category names only from the supplied category list when confident.'
  ].join(' ');
}

function extractJson(content: string) {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenced?.[1]?.trim() ?? trimmed;
}
