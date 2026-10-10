import { describe, expect, it } from 'vitest';
import { InMemoryCategoryPreferenceRepository } from '../../infrastructure/repositories/in-memory.js';
import { CategoryPreferenceService } from './category-preference.service.js';

function setup() {
  const repository = new InMemoryCategoryPreferenceRepository();
  return { repository, service: new CategoryPreferenceService(repository) };
}

describe('CategoryPreferenceService', () => {
  it('normalizes accents, punctuation, case and whitespace, and rejects empty signals', () => {
    const { service } = setup();
    expect(service.normalizeSignal('  Panadería,   CENTRAL!!! ')).toBe('panaderia central');
    expect(service.normalizeSignal('  СУПЕР-маркет  ')).toBe('супер маркет');
    expect(() => service.normalizeSignal(' !? ')).toThrow();
  });

  it('uses an explicit correction immediately within the same account only', async () => {
    const { service } = setup();
    await service.recordConfirmedSelection({ financialAccountId: 'home', concept: 'Uber Chile', categoryId: 'transport', explicit: true });
    await expect(service.resolve({ financialAccountId: 'home', concept: 'ÚBER, Chile!' })).resolves.toMatchObject({
      categoryId: 'transport', source: 'explicit_correction'
    });
    await expect(service.resolve({ financialAccountId: 'personal', concept: 'Uber Chile' })).resolves.toBeUndefined();
  });

  it('materializes consensus on the third matching confirmed selection', async () => {
    const { service } = setup();
    const selection = { financialAccountId: 'home', concept: 'Panadería Central', categoryId: 'food', subcategoryId: 'groceries', explicit: false };
    await service.recordConfirmedSelection(selection);
    await service.recordConfirmedSelection(selection);
    await expect(service.resolve({ financialAccountId: 'home', concept: 'panaderia central' })).resolves.toBeUndefined();
    await service.recordConfirmedSelection(selection);
    await expect(service.resolve({ financialAccountId: 'home', concept: 'panaderia central' })).resolves.toMatchObject({
      categoryId: 'food', subcategoryId: 'groceries', source: 'historical_consensus', evidenceCount: 3
    });
  });

  it('does not learn from conflicting selections and withdraws a previous consensus', async () => {
    const { service } = setup();
    const base = { financialAccountId: 'home', concept: 'Taxi', categoryId: 'transport', explicit: false };
    for (let i = 0; i < 3; i += 1) await service.recordConfirmedSelection(base);
    await service.recordConfirmedSelection({ ...base, categoryId: 'travel' });
    await expect(service.resolve({ financialAccountId: 'home', concept: 'taxi' })).resolves.toBeUndefined();
    await service.recordConfirmedSelection(base);
    await expect(service.resolve({ financialAccountId: 'home', concept: 'taxi' })).resolves.toBeUndefined();
  });

  it('keeps an explicit correction despite later conflicting evidence', async () => {
    const { service } = setup();
    const base = { financialAccountId: 'home', concept: 'Uber', categoryId: 'transport' };
    await service.recordConfirmedSelection({ ...base, explicit: true });
    for (let i = 0; i < 3; i += 1) {
      await service.recordConfirmedSelection({ ...base, categoryId: 'travel', explicit: false });
    }
    await expect(service.resolve({ financialAccountId: 'home', concept: 'uber' })).resolves.toMatchObject({
      categoryId: 'transport', source: 'explicit_correction'
    });
  });
});
