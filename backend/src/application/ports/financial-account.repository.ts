import type {
  FinancialAccount,
  FinancialAccountId,
  FinancialAccountInvitation,
  FinancialAccountMember,
  FinancialAccountMemberProfile,
  FinancialAccountMemberRole,
  MessagingChannelContext,
  TenantId,
  UserId
} from '../../domain/index.js';

export interface FinancialAccountMembershipRecord {
  account: FinancialAccount;
  role: FinancialAccountMemberRole;
}

export interface FinancialAccountRepository {
  ensurePersonalAccount(userId: UserId): Promise<FinancialAccount>;
  findAccessibleById(userId: UserId, financialAccountId: FinancialAccountId): Promise<FinancialAccountMembershipRecord | undefined>;
  listAccessibleByUser(userId: UserId): Promise<FinancialAccountMembershipRecord[]>;
  findById(financialAccountId: FinancialAccountId): Promise<FinancialAccount | undefined>;
  createSharedAccount(input: {
    tenantId: TenantId;
    createdByUserId: UserId;
    name: string;
    currency: string;
  }): Promise<FinancialAccountMembershipRecord>;
  updateSharedAccountName(input: {
    financialAccountId: FinancialAccountId;
    name: string;
  }): Promise<FinancialAccount | undefined>;
  listMembers(financialAccountId: FinancialAccountId): Promise<FinancialAccountMemberProfile[]>;
  findMember(financialAccountId: FinancialAccountId, userId: UserId): Promise<FinancialAccountMember | undefined>;
  upsertMember(input: {
    financialAccountId: FinancialAccountId;
    userId: UserId;
    role: FinancialAccountMemberRole;
    status: FinancialAccountMember['status'];
    joinedAt?: string;
  }): Promise<FinancialAccountMember>;
  removeMember(financialAccountId: FinancialAccountId, userId: UserId): Promise<boolean>;
  countActiveOwners(financialAccountId: FinancialAccountId): Promise<number>;
  createInvitation(input: {
    financialAccountId: FinancialAccountId;
    invitedByUserId?: UserId;
    email: string;
    phoneNumber?: string;
    role: FinancialAccountMemberRole;
    token: string;
    expiresAt: string;
  }): Promise<FinancialAccountInvitation>;
  findPendingInvitationByToken(token: string, now: string): Promise<FinancialAccountInvitation | undefined>;
  markInvitationAccepted(token: string, acceptedAt: string): Promise<void>;
  findMessagingContext(channel: MessagingChannelContext['channel'], providerUserId: string): Promise<MessagingChannelContext | undefined>;
  upsertMessagingContext(input: {
    channel: MessagingChannelContext['channel'];
    providerUserId: string;
    userId: UserId;
    financialAccountId: FinancialAccountId;
  }): Promise<MessagingChannelContext>;
}
