import { describe, expect, it, vi } from 'vitest';

describe('loadConfig', () => {
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
