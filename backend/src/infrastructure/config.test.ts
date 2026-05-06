import { describe, expect, it, vi } from 'vitest';

describe('loadConfig', () => {
  it('parses string false as false for USE_IN_MEMORY_REPOSITORIES', async () => {
    vi.resetModules();
    vi.stubEnv('USE_IN_MEMORY_REPOSITORIES', 'false');

    const { loadConfig } = await import('./config.js');

    expect(loadConfig().useInMemoryRepositories).toBe(false);
    vi.unstubAllEnvs();
  });

  it('parses string true as true for USE_IN_MEMORY_REPOSITORIES', async () => {
    vi.resetModules();
    vi.stubEnv('USE_IN_MEMORY_REPOSITORIES', 'true');

    const { loadConfig } = await import('./config.js');

    expect(loadConfig().useInMemoryRepositories).toBe(true);
    vi.unstubAllEnvs();
  });

  it('supports GitHub Models as the message interpreter provider', async () => {
    vi.resetModules();
    vi.stubEnv('MESSAGE_INTERPRETER_PROVIDER', 'github-models');

    const { loadConfig } = await import('./config.js');
    const config = loadConfig();

    expect(config.messageInterpreterProvider).toBe('github-models');
    expect(config.messageInterpreterBaseUrl).toBe('https://models.github.ai/inference');
    expect(config.messageInterpreterModel).toBe('deepseek/DeepSeek-V3-0324');
    vi.unstubAllEnvs();
  });
});
