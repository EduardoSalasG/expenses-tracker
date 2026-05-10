import type { MonthlyBudget, TenantId } from '../../domain/types.js';

export interface BudgetRepository {
  upsertMonthly(input: Omit<MonthlyBudget, 'id'>): Promise<MonthlyBudget>;
  listMonthly(tenantId: TenantId, month: string): Promise<MonthlyBudget[]>;
}
