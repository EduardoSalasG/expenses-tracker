import type { Logger } from 'winston';
import { z } from 'zod';
import type { CategoryTranslationInput, CategoryTranslationResult, CategoryTranslatorPort } from '../application/ports.js';
import type { AppConfig } from './config.js';

const categoryTranslationSchema = z.object({
  es: z.string().trim().min(1).max(120),
  en: z.string().trim().min(1).max(120)
});

export class ChatCompletionsCategoryTranslator implements CategoryTranslatorPort {
  constructor(
    private readonly config: AppConfig,
    private readonly logger: Logger
  ) {}

  async translate(input: CategoryTranslationInput): Promise<CategoryTranslationResult | undefined> {
    if (!this.config.messageInterpreterApiKey) return undefined;

    try {
      const response = await fetch(`${this.config.messageInterpreterBaseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: buildHeaders(this.config),
        body: JSON.stringify({
          model: this.config.messageInterpreterModel,
          temperature: 0,
          messages: [
            {
              role: 'system',
              content: 'Translate a single finance category label. Return only JSON with string fields es and en. Preserve brand names and acronyms. Do not add context or commentary.'
            },
            {
              role: 'user',
              content: JSON.stringify({ task: 'translate_category_label', ...input })
            }
          ]
        })
      });

      if (!response.ok) {
        this.logger.warn('Category translator provider failed.', { status: response.status });
        return undefined;
      }

      const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      const content = payload.choices?.[0]?.message?.content;
      if (!content) return undefined;

      const translation = categoryTranslationSchema.parse(JSON.parse(extractJson(content)));
      return { nameEs: translation.es, nameEn: translation.en };
    } catch (error) {
      this.logger.warn('Category translator unavailable.', { error });
      return undefined;
    }
  }
}

export class NoopCategoryTranslator implements CategoryTranslatorPort {
  async translate(): Promise<undefined> {
    return undefined;
  }
}

export function createCategoryTranslator(config: AppConfig, logger: Logger): CategoryTranslatorPort {
  if (!config.messageInterpreterApiKey) return new NoopCategoryTranslator();
  if (config.messageInterpreterProvider === 'deterministic') return new NoopCategoryTranslator();
  return new ChatCompletionsCategoryTranslator(config, logger);
}

function buildHeaders(config: AppConfig) {
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

function extractJson(content: string) {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenced?.[1]?.trim() ?? trimmed;
}
