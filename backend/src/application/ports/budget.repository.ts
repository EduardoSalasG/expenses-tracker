import type { MonthlyBudget, TenantId } from '../../domain/index.js';

export interface BudgetRepository {
  upsertMonthly(input: Omit<MonthlyBudget, 'id'>): Promise<MonthlyBudget>;
  listMonthly(tenantId: TenantId, financialAccountId?: string): Promise<MonthlyBudget[]>;
}
