import { describe, expect, it, vi } from 'vitest';

describe('loadConfig', () => {
  it.each([
    ['uses the development JWT secret', { JWT_SECRET: 'change-me-local-secret' }],
    ['uses the local development database URL', { JWT_SECRET: 'production-secret', DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/expenses_tracker' }],
    ['allows every CORS origin', { JWT_SECRET: 'production-secret', FRONTEND_ORIGIN: '*' }],
    ['enables Telegram without a webhook secret', { JWT_SECRET: 'production-secret', TELEGRAM_BOT_TOKEN: 'bot-token', TELEGRAM_WEBHOOK_SECRET_TOKEN: '' }]
  ])('rejects production configuration that %s', async (_reason, overrides) => {
    vi.resetModules();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('DATABASE_URL', 'postgres://production.example/expenses');
    vi.stubEnv('JWT_SECRET', 'production-secret');
    vi.stubEnv('FRONTEND_ORIGIN', 'https://expenses.example');
    vi.stubEnv('TELEGRAM_BOT_TOKEN', '');
    vi.stubEnv('TELEGRAM_WEBHOOK_SECRET_TOKEN', '');
    for (const [key, value] of Object.entries(overrides)) vi.stubEnv(key, value);

    const { loadConfig } = await import('./config.js');

    expect(() => loadConfig()).toThrow();
    vi.unstubAllEnvs();
  });

  it('parses string false as false for USE_IN_MEMORY_REPOSITORIES', async () => {
    vi.resetModules();
    vi.stubEnv('USE_IN_MEMORY_REPOSITORIES', 'false');
    vi.stubEnv('MESSAGE_INTERPRETER_PROVIDER', 'deterministic');
    vi.stubEnv('MESSAGE_INTERPRETER_BASE_URL', '');

    const { loadConfig } = await import('./config.js');

    expect(loadConfig().useInMemoryRepositories).toBe(false);
    vi.unstubAllEnvs();
  });

  it('parses string true as true for USE_IN_MEMORY_REPOSITORIES', async () => {
    vi.resetModules();
    vi.stubEnv('USE_IN_MEMORY_REPOSITORIES', 'true');
    vi.stubEnv('MESSAGE_INTERPRETER_PROVIDER', 'deterministic');
    vi.stubEnv('MESSAGE_INTERPRETER_BASE_URL', '');

    const { loadConfig } = await import('./config.js');

    expect(loadConfig().useInMemoryRepositories).toBe(true);
    vi.unstubAllEnvs();
  });

  it('supports OpenRouter as the message interpreter provider', async () => {
    vi.resetModules();
    vi.stubEnv('MESSAGE_INTERPRETER_PROVIDER', 'openrouter');
    vi.stubEnv('MESSAGE_INTERPRETER_BASE_URL', '');
    vi.stubEnv('MESSAGE_INTERPRETER_MODEL', 'deepseek/DeepSeek-V3-0324');

    const { loadConfig } = await import('./config.js');
    const config = loadConfig();

    expect(config.messageInterpreterProvider).toBe('openrouter');
    expect(config.messageInterpreterBaseUrl).toBe('https://openrouter.ai/api/v1');
    expect(config.messageInterpreterModel).toBe('deepseek/DeepSeek-V3-0324');
    vi.unstubAllEnvs();
  });

  it('keeps GitHub Models as a legacy-compatible provider alias', async () => {
    vi.resetModules();
    vi.stubEnv('MESSAGE_INTERPRETER_PROVIDER', 'github-models');
    vi.stubEnv('MESSAGE_INTERPRETER_BASE_URL', '');

    const { loadConfig } = await import('./config.js');
    const config = loadConfig();

    expect(config.messageInterpreterProvider).toBe('github-models');
    expect(config.messageInterpreterBaseUrl).toBe('https://models.github.ai/inference');
    vi.unstubAllEnvs();
  });

  it('keeps OTP debug response disabled by default', async () => {
    vi.resetModules();

    const { loadConfig } = await import('./config.js');

    expect(loadConfig().otpDebugResponseEnabled).toBe(false);
  });

  it('parses OTP debug response flag when explicitly enabled', async () => {
    vi.resetModules();
    vi.stubEnv('OTP_DEBUG_RESPONSE_ENABLED', 'true');

    const { loadConfig } = await import('./config.js');

    expect(loadConfig().otpDebugResponseEnabled).toBe(true);
    vi.unstubAllEnvs();
  });
});
