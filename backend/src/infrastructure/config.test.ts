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
});
