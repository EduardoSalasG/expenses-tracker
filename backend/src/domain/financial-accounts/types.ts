import type { CurrencyCode } from '../finance/index.js';
import type { TenantId } from '../tenancy/index.js';
import type { UserId } from '../users/index.js';

export type FinancialAccountId = string;
export type FinancialAccountType = 'personal' | 'shared';
export type FinancialAccountMemberRole = 'owner' | 'admin' | 'member';
export type FinancialAccountMemberStatus = 'active' | 'invited' | 'removed';

export interface FinancialAccount {
  id: FinancialAccountId;
  tenantId: TenantId;
  type: FinancialAccountType;
  name: string;
  currency: CurrencyCode;
  createdByUserId: UserId;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialAccountMember {
  id: string;
  financialAccountId: FinancialAccountId;
  userId: UserId;
  role: FinancialAccountMemberRole;
  status: FinancialAccountMemberStatus;
  joinedAt?: string;
  createdAt: string;
  updatedAt: string;
}
