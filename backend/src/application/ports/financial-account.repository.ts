import type { FinancialAccount, FinancialAccountId, FinancialAccountMemberRole, TenantId, UserId } from '../../domain/index.js';

export interface FinancialAccountMembershipRecord {
  account: FinancialAccount;
  role: FinancialAccountMemberRole;
}

export interface FinancialAccountRepository {
  ensurePersonalAccount(userId: UserId): Promise<FinancialAccount>;
  findAccessibleById(userId: UserId, financialAccountId: FinancialAccountId): Promise<FinancialAccountMembershipRecord | undefined>;
  listAccessibleByUser(userId: UserId): Promise<FinancialAccountMembershipRecord[]>;
  createSharedAccount(input: {
    tenantId: TenantId;
    createdByUserId: UserId;
    name: string;
    currency: string;
  }): Promise<FinancialAccountMembershipRecord>;
}
