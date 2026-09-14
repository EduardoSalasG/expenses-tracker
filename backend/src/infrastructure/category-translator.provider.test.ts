import { describe, expect, it, vi } from 'vitest';
import type { AppConfig } from './config.js';
import { ChatCompletionsCategoryTranslator } from './category-translator.provider.js';
import { CategoryTranslationService } from '../application/services/category-translation.service.js';
import { InMemoryCategoryRepository } from './repositories/in-memory.js';

describe('ChatCompletionsCategoryTranslator', () => {
  it('sends only category context and returns both localized labels', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: '{"es":"Baile","en":"Dance"}' } }]
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const translator = new ChatCompletionsCategoryTranslator(config(), logger());

    await expect(translator.translate({
      name: 'Dance',
      parentName: 'Education',
      role: 'subcategory'
    })).resolves.toEqual({ nameEs: 'Baile', nameEn: 'Dance' });

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const payload = JSON.parse(String(request.body));
    const categoryContext = payload.messages[1].content;
    expect(categoryContext).toContain('"name":"Dance"');
    expect(categoryContext).toContain('"parentName":"Education"');
    expect(categoryContext).not.toContain('tenantId');
    expect(categoryContext).not.toContain('financialAccountId');
    expect(categoryContext).not.toContain('userId');
  });

  it('returns undefined when the provider is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('unavailable', { status: 503 })));
    const translator = new ChatCompletionsCategoryTranslator(config(), logger());

    await expect(translator.translate({ name: 'Investments', role: 'root' })).resolves.toBeUndefined();
  });

  it('persists automatic labels without replacing manual labels', async () => {
    const categories = new InMemoryCategoryRepository();
    const category = await categories.create({
      tenantId: 'tenant-1',
      financialAccountId: 'account-1',
      name: 'Investments',
      isDefault: false
    });
    const service = new CategoryTranslationService(categories, {
      translate: vi.fn().mockResolvedValue({ nameEs: 'Inversiones', nameEn: 'Investments' })
    });

    await expect(service.localize(category)).resolves.toMatchObject({
      nameEs: 'Inversiones',
      nameEn: 'Investments',
      translationSource: 'automatic'
    });
  });
});

function config(): AppConfig {
  return {
    messageInterpreterProvider: 'openrouter',
    messageInterpreterApiKey: 'test-key',
    messageInterpreterBaseUrl: 'https://openrouter.example/api/v1',
    messageInterpreterModel: 'test-model',
    messageInterpreterTemperature: 0.1,
    messageInterpreterHttpReferer: '',
    messageInterpreterAppName: 'Expenses Tracker',
    frontendPublicOrigin: 'http://localhost:4200'
  } as AppConfig;
}

function logger() {
  return { warn: vi.fn() } as never;
}
