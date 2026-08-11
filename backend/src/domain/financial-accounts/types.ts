import type { CurrencyCode } from '../finance/index.js';
import type { MessagingChannel } from '../messaging/index.js';
import type { TenantId } from '../tenancy/index.js';
import type { UserId } from '../users/index.js';

export type FinancialAccountId = string;
export type FinancialAccountType = 'personal' | 'shared';
export type FinancialAccountMemberRole = 'owner' | 'admin' | 'member';
export type FinancialAccountMemberStatus = 'active' | 'invited' | 'removed';
export type FinancialAccountInvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

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

export interface FinancialAccountMemberProfile {
  memberId: string;
  financialAccountId: FinancialAccountId;
  userId: UserId;
  role: FinancialAccountMemberRole;
  status: FinancialAccountMemberStatus;
  joinedAt?: string;
  createdAt: string;
  updatedAt: string;
  firstName: string;
  lastName: string;
  preferredName: string;
  email?: string;
  phoneNumber: string;
}

export interface FinancialAccountInvitation {
  id: string;
  financialAccountId: FinancialAccountId;
  invitedByUserId?: UserId;
  email: string;
  phoneNumber?: string;
  role: FinancialAccountMemberRole;
  token: string;
  status: FinancialAccountInvitationStatus;
  expiresAt: string;
  acceptedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessagingChannelContext {
  id: string;
  channel: MessagingChannel;
  providerUserId: string;
  userId: UserId;
  financialAccountId: FinancialAccountId;
  updatedAt: string;
}
