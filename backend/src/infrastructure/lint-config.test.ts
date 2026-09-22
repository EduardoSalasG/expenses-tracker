import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

describe('backend lint configuration', () => {
  it('resolves a flat ESLint configuration for TypeScript sources', async () => {
    const backendRoot = fileURLToPath(new URL('../..', import.meta.url));
    const eslint = new ESLint({ cwd: backendRoot });
    const config = await eslint.calculateConfigForFile('src/main.ts');

    expect(config.languageOptions?.parser).toBeDefined();
    expect(config.plugins).toHaveProperty('@typescript-eslint');
  });
});
