import type { CategoryPreference, CategoryPreferenceRepository, CategoryPreferenceSelection } from '../ports/index.js';

export class CategoryPreferenceService {
  constructor(private readonly preferences: CategoryPreferenceRepository) {}

  normalizeSignal(concept: string): string {
    const signal = concept.normalize('NFD').replace(/\p{M}/gu, '')
      .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
    if (!signal) throw new Error('Category preference concept must contain letters or numbers.');
    return signal;
  }

  resolve(input: { financialAccountId: string; concept: string }): Promise<CategoryPreference | undefined> {
    return this.preferences.findForSignal({
      financialAccountId: input.financialAccountId,
      signal: this.normalizeSignal(input.concept)
    });
  }

  async recordConfirmedSelection(input: Omit<CategoryPreferenceSelection, 'signal'> & { concept: string; explicit: boolean }): Promise<void> {
    const selection = {
      financialAccountId: input.financialAccountId,
      signal: this.normalizeSignal(input.concept),
      categoryId: input.categoryId,
      subcategoryId: input.subcategoryId
    };
    if (input.explicit) {
      await this.preferences.upsertExplicit(selection);
    } else {
      await this.preferences.recordConsensusEvidence(selection);
    }
  }
}
