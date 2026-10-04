import { describe, expect, it } from 'vitest';
import { createLogger } from './logger.js';

describe('createLogger', () => {
  it('adds stable service, environment and generated version metadata', () => {
    const logger = createLogger({ nodeEnv: 'production', logLevel: 'info' });

    expect(logger.level).toBe('info');
    expect(logger.defaultMeta).toMatchObject({
      service: 'expenses-tracker-api',
      environment: 'production',
      version: '0.3.4'
    });
  });
});
