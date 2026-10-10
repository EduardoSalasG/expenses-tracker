export interface CategoryPreferenceSelection {
  financialAccountId: string;
  signal: string;
  categoryId: string;
  subcategoryId?: string;
}

export interface CategoryPreference extends CategoryPreferenceSelection {
  id: string;
  source: 'explicit_correction' | 'historical_consensus';
  evidenceCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryPreferenceCandidate extends CategoryPreferenceSelection {
  evidenceCount: number;
}

export interface CategoryPreferenceRepository {
  findForSignal(input: { financialAccountId: string; signal: string }): Promise<CategoryPreference | undefined>;
  upsertExplicit(input: CategoryPreferenceSelection): Promise<CategoryPreference>;
  recordConsensusEvidence(input: CategoryPreferenceSelection): Promise<CategoryPreference | undefined>;
  listConsensusCandidates(): Promise<CategoryPreferenceCandidate[]>;
}
