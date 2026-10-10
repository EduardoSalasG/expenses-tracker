import { describe, expect, it } from 'vitest';
import { InMemoryCategoryPreferenceRepository, InMemoryCategoryRepository, InMemoryFinancialAccountRepository } from '../../infrastructure/repositories/in-memory.js';
import { CategoryPreferenceService } from './category-preference.service.js';

async function setup() {
  const accounts = new InMemoryFinancialAccountRepository();
  const categories = new InMemoryCategoryRepository();
  const home = (await accounts.createSharedAccount({ tenantId: 'tenant', createdByUserId: 'owner', name: 'Home', currency: 'CLP' })).account;
  const personal = (await accounts.createSharedAccount({ tenantId: 'tenant', createdByUserId: 'owner', name: 'Personal', currency: 'CLP' })).account;
  const transport = await categories.create({ tenantId: 'tenant', financialAccountId: home.id, name: 'Transport', isDefault: false });
  const food = await categories.create({ tenantId: 'tenant', financialAccountId: home.id, name: 'Food', isDefault: false });
  const groceries = await categories.create({ tenantId: 'tenant', financialAccountId: home.id, name: 'Groceries', parentId: food.id, isDefault: false });
  const travel = await categories.create({ tenantId: 'tenant', financialAccountId: home.id, name: 'Travel', isDefault: false });
  const repository = new InMemoryCategoryPreferenceRepository(accounts, categories);
  return { repository, service: new CategoryPreferenceService(repository), home, personal, transport, food, groceries, travel };
}

describe('CategoryPreferenceService', () => {
  it('rejects categories outside the account and unrelated subcategories', async () => {
    const accounts = new InMemoryFinancialAccountRepository();
    const categories = new InMemoryCategoryRepository();
    const home = (await accounts.createSharedAccount({ tenantId: 'tenant', createdByUserId: 'owner', name: 'Home', currency: 'CLP' })).account;
    const other = (await accounts.createSharedAccount({ tenantId: 'tenant', createdByUserId: 'owner', name: 'Other', currency: 'CLP' })).account;
    const homeRoot = await categories.create({ tenantId: 'tenant', financialAccountId: home.id, name: 'Food', isDefault: false });
    const homeChild = await categories.create({ tenantId: 'tenant', financialAccountId: home.id, name: 'Groceries', parentId: homeRoot.id, isDefault: false });
    const otherRoot = await categories.create({ tenantId: 'tenant', financialAccountId: other.id, name: 'Transport', isDefault: false });
    const otherChild = await categories.create({ tenantId: 'tenant', financialAccountId: other.id, name: 'Taxi', parentId: otherRoot.id, isDefault: false });
    const preferences = new InMemoryCategoryPreferenceRepository(accounts, categories);

    await expect(preferences.upsertExplicit({ financialAccountId: home.id, signal: 'taxi', categoryId: otherRoot.id })).rejects.toThrow();
    await expect(preferences.recordConsensusEvidence({ financialAccountId: home.id, signal: 'food', categoryId: homeRoot.id, subcategoryId: otherChild.id })).rejects.toThrow();
    await expect(preferences.upsertExplicit({ financialAccountId: home.id, signal: 'food', categoryId: otherRoot.id, subcategoryId: homeChild.id })).rejects.toThrow();
    await expect(preferences.findForSignal({ financialAccountId: home.id, signal: 'taxi' })).resolves.toBeUndefined();
    await expect(preferences.listConsensusCandidates()).resolves.toEqual([]);
  });
  it('normalizes accents, punctuation, case and whitespace, and rejects empty signals', async () => {
    const { service } = await setup();
    expect(service.normalizeSignal('  Panadería,   CENTRAL!!! ')).toBe('panaderia central');
    expect(service.normalizeSignal('  СУПЕР-маркет  ')).toBe('супер маркет');
    expect(() => service.normalizeSignal(' !? ')).toThrow();
  });

  it('uses an explicit correction immediately within the same account only', async () => {
    const { service, home, personal, transport } = await setup();
    await service.recordConfirmedSelection({ financialAccountId: home.id, concept: 'Uber Chile', categoryId: transport.id, explicit: true });
    await expect(service.resolve({ financialAccountId: home.id, concept: 'ÚBER, Chile!' })).resolves.toMatchObject({
      categoryId: transport.id, source: 'explicit_correction'
    });
    await expect(service.resolve({ financialAccountId: personal.id, concept: 'Uber Chile' })).resolves.toBeUndefined();
  });

  it('materializes consensus on the third matching confirmed selection', async () => {
    const { service, home, food, groceries } = await setup();
    const selection = { financialAccountId: home.id, concept: 'Panadería Central', categoryId: food.id, subcategoryId: groceries.id, explicit: false };
    await service.recordConfirmedSelection(selection);
    await service.recordConfirmedSelection(selection);
    await expect(service.resolve({ financialAccountId: home.id, concept: 'panaderia central' })).resolves.toBeUndefined();
    await service.recordConfirmedSelection(selection);
    await expect(service.resolve({ financialAccountId: home.id, concept: 'panaderia central' })).resolves.toMatchObject({
      categoryId: food.id, subcategoryId: groceries.id, source: 'historical_consensus', evidenceCount: 3
    });
  });

  it('does not learn from conflicting selections and withdraws a previous consensus', async () => {
    const { service, home, transport, travel } = await setup();
    const base = { financialAccountId: home.id, concept: 'Taxi', categoryId: transport.id, explicit: false };
    for (let i = 0; i < 3; i += 1) await service.recordConfirmedSelection(base);
    await service.recordConfirmedSelection({ ...base, categoryId: travel.id });
    await expect(service.resolve({ financialAccountId: home.id, concept: 'taxi' })).resolves.toBeUndefined();
    await service.recordConfirmedSelection(base);
    await expect(service.resolve({ financialAccountId: home.id, concept: 'taxi' })).resolves.toBeUndefined();
  });

  it('keeps an explicit correction despite later conflicting evidence', async () => {
    const { service, home, transport, travel } = await setup();
    const base = { financialAccountId: home.id, concept: 'Uber', categoryId: transport.id };
    await service.recordConfirmedSelection({ ...base, explicit: true });
    for (let i = 0; i < 3; i += 1) {
      await service.recordConfirmedSelection({ ...base, categoryId: travel.id, explicit: false });
    }
    await expect(service.resolve({ financialAccountId: home.id, concept: 'uber' })).resolves.toMatchObject({
      categoryId: transport.id, source: 'explicit_correction'
    });
  });
});
