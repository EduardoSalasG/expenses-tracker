import { randomUUID } from 'node:crypto';
import type {
  BankOption,
  Category,
  FinancialAccount,
  FinancialAccountInvitation,
  FinancialAccountSettlementSuggestion,
  FinancialAccountSettlement,
  FinancialAccountMemberProfile,
  MonthlyBudget,
  PaymentMethodOption,
  User
} from '../../domain/index.js';
import type {
  BankOptionRepository,
  BudgetRepository,
  CategoryRepository,
  FinancialAccountRepository,
  PaymentMethodOptionRepository,
  UserRepository
} from '../ports.js';
import type { EmailProvider } from '../ports.js';
import { buildFinancialAccountInvitationEmail } from '../financial-account-invitation-email.js';

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface InvitationNotificationOptions {
  email?: EmailProvider;
  frontendPublicOrigin?: string;
  now?: () => Date;
}

export class FinancialAccountsUseCases {
  constructor(
    private readonly financialAccounts: FinancialAccountRepository,
    private readonly categories: CategoryRepository,
    private readonly budgets: BudgetRepository,
    private readonly banks: BankOptionRepository,
    private readonly paymentMethods: PaymentMethodOptionRepository,
    private readonly users: UserRepository,
    private readonly invitationNotifications: InvitationNotificationOptions = {}
  ) {}

  listAccounts(userId: string) {
    return this.financialAccounts.listAccessibleByUser(userId);
  }

  async getAccountContext(userId: string, financialAccountId?: string) {
    const current = financialAccountId
      ? await this.financialAccounts.findAccessibleById(userId, financialAccountId)
      : undefined;
    const fallback = current ?? {
      account: await this.financialAccounts.ensurePersonalAccount(userId),
      role: 'owner' as const
    };

    return {
      current: fallback,
      accounts: await this.financialAccounts.listAccessibleByUser(userId)
    };
  }

  async selectAccount(userId: string, financialAccountId: string) {
    const membership = await this.financialAccounts.findAccessibleById(userId, financialAccountId);
    if (!membership) {
      throw new Error('Financial account not found.');
    }
    return membership;
  }

  async createSharedAccount(input: {
    userId: string;
    tenantId: string;
    sourceFinancialAccountId?: string;
    name: string;
    currency: string;
  }) {
    const sourceContext = await this.getAccountContext(input.userId, input.sourceFinancialAccountId);
    const created = await this.financialAccounts.createSharedAccount({
      tenantId: input.tenantId,
      createdByUserId: input.userId,
      name: input.name,
      currency: input.currency
    });

    await this.cloneScopeData({
      tenantId: input.tenantId,
      sourceFinancialAccountId: sourceContext.current.account.id,
      targetFinancialAccountId: created.account.id,
      currency: input.currency
    });

    return created;
  }

  async renameSharedAccount(input: {
    actorUserId: string;
    financialAccountId: string;
    name: string;
  }) {
    await this.requireManager(input.actorUserId, input.financialAccountId);
    const updated = await this.financialAccounts.updateSharedAccountName({
      financialAccountId: input.financialAccountId,
      name: input.name
    });
    if (!updated) {
      throw new Error('Financial account not found.');
    }
    return updated;
  }

  async listMembers(actorUserId: string, financialAccountId: string) {
    await this.requireMember(actorUserId, financialAccountId);
    return this.financialAccounts.listMembers(financialAccountId);
  }

  async listBalances(actorUserId: string, financialAccountId: string) {
    const membership = await this.requireMember(actorUserId, financialAccountId);
    this.requireSharedAccount(membership.account);
    return this.financialAccounts.listBalances(financialAccountId);
  }

  async listMemberPeriodSpending(actorUserId: string, financialAccountId: string, from: string, to: string) {
    const membership = await this.requireMember(actorUserId, financialAccountId);
    this.requireSharedAccount(membership.account);
    return this.financialAccounts.listMemberPeriodSpending({ financialAccountId, from, to });
  }

  async listSettlementSuggestions(actorUserId: string, financialAccountId: string): Promise<FinancialAccountSettlementSuggestion[]> {
    const membership = await this.requireMember(actorUserId, financialAccountId);
    this.requireSharedAccount(membership.account);
    return this.financialAccounts.listSettlementSuggestions(financialAccountId);
  }

  async listSettlements(actorUserId: string, financialAccountId: string) {
    const membership = await this.requireMember(actorUserId, financialAccountId);
    this.requireSharedAccount(membership.account);
    return this.financialAccounts.listSettlements(financialAccountId);
  }

  async createSettlement(input: {
    actorUserId: string;
    financialAccountId: string;
    paidByUserId: string;
    receivedByUserId: string;
    currency: string;
    amount: number;
    settledAt: string;
    note?: string;
  }): Promise<FinancialAccountSettlement> {
    const membership = await this.requireMember(input.actorUserId, input.financialAccountId);
    this.requireSharedAccount(membership.account);

    if (input.paidByUserId === input.receivedByUserId) {
      throw new Error('Settlement payer and receiver must be different members.');
    }

    const [payer, receiver] = await Promise.all([
      this.financialAccounts.findMember(input.financialAccountId, input.paidByUserId),
      this.financialAccounts.findMember(input.financialAccountId, input.receivedByUserId)
    ]);
    if (!payer || payer.status !== 'active') {
      throw new Error('Settlement payer must be an active member of the shared account.');
    }
    if (!receiver || receiver.status !== 'active') {
      throw new Error('Settlement receiver must be an active member of the shared account.');
    }

    return this.financialAccounts.createSettlement({
      financialAccountId: input.financialAccountId,
      recordedByUserId: input.actorUserId,
      paidByUserId: input.paidByUserId,
      receivedByUserId: input.receivedByUserId,
      currency: input.currency,
      amount: input.amount,
      settledAt: input.settledAt,
      note: input.note
    });
  }

  async inviteMember(input: {
    actorUserId: string;
    financialAccountId: string;
    email: string;
  }) {
    const membership = await this.requireManager(input.actorUserId, input.financialAccountId);
    const now = this.now();
    const invitation = await this.financialAccounts.createInvitation({
      financialAccountId: input.financialAccountId,
      invitedByUserId: input.actorUserId,
      email: input.email,
      role: 'member',
      token: randomUUID(),
      expiresAt: new Date(now.getTime() + INVITATION_TTL_MS).toISOString()
    });
    return this.deliverInvitationEmail({ invitation, account: membership.account, inviterUserId: input.actorUserId });
  }

  async acceptInvitation(input: {
    actorUserId: string;
    token: string;
  }) {
    const invitation = await this.financialAccounts.findPendingInvitationByToken(input.token, new Date().toISOString());
    if (!invitation) {
      throw new Error('Invitation not found or expired.');
    }

    const user = await this.users.findById(input.actorUserId);
    if (!user) {
      throw new Error('User not found.');
    }

    const matchesEmail = Boolean(user.email && user.email.trim().toLowerCase() === invitation.email.trim().toLowerCase());
    const matchesPhone = Boolean(invitation.phoneNumber && normalizePhone(user.phoneNumber) === normalizePhone(invitation.phoneNumber));
    if (!matchesEmail && !matchesPhone) {
      throw new Error('Invitation does not belong to the authenticated user.');
    }

    const joinedAt = new Date().toISOString();
    await this.financialAccounts.upsertMember({
      financialAccountId: invitation.financialAccountId,
      userId: user.id,
      role: invitation.role,
      status: 'active',
      joinedAt
    });
    await this.financialAccounts.markInvitationAccepted(invitation.token, joinedAt);

    const membership = await this.financialAccounts.findAccessibleById(user.id, invitation.financialAccountId);
    if (!membership) {
      throw new Error('Unable to activate invited membership.');
    }
    return {
      invitation,
      membership
    };
  }

  async removeMember(input: {
    actorUserId: string;
    financialAccountId: string;
    memberUserId: string;
  }) {
    const actorMembership = await this.requireManager(input.actorUserId, input.financialAccountId);
    const targetMembership = await this.financialAccounts.findMember(input.financialAccountId, input.memberUserId);
    if (!targetMembership || targetMembership.status === 'removed') {
      throw new Error('Member not found.');
    }

    if (targetMembership.role === 'owner' && actorMembership.role !== 'owner') {
      throw new Error('Only an owner can remove another owner.');
    }

    if (targetMembership.role === 'owner') {
      const owners = await this.financialAccounts.countActiveOwners(input.financialAccountId);
      if (owners <= 1) {
        throw new Error('The account must keep at least one active owner.');
      }
    }

    await this.financialAccounts.removeMember(input.financialAccountId, input.memberUserId);
    return { success: true as const };
  }

  async switchMessagingContext(input: {
    userId: string;
    channel: 'whatsapp' | 'telegram';
    providerUserId: string;
    accountName: string;
  }) {
    const memberships = await this.financialAccounts.listAccessibleByUser(input.userId);
    const normalizedTarget = normalizeAccountName(input.accountName);
    const matched = memberships.find((membership) => normalizeAccountName(membership.account.name) === normalizedTarget);
    if (!matched) {
      return {
        status: 'not_found' as const,
        accounts: memberships.map((membership) => membership.account.name)
      };
    }

    await this.financialAccounts.upsertMessagingContext({
      channel: input.channel,
      providerUserId: input.providerUserId,
      userId: input.userId,
      financialAccountId: matched.account.id
    });

    return {
      status: 'ok' as const,
      membership: matched
    };
  }

  async resolveMessagingContext(input: {
    userId: string;
    channel: 'whatsapp' | 'telegram';
    providerUserId?: string;
  }) {
    if (!input.providerUserId) {
      return {
        account: await this.financialAccounts.ensurePersonalAccount(input.userId),
        role: 'owner' as const
      };
    }

    const context = await this.financialAccounts.findMessagingContext(input.channel, input.providerUserId);
    if (!context || context.userId !== input.userId) {
      return {
        account: await this.financialAccounts.ensurePersonalAccount(input.userId),
        role: 'owner' as const
      };
    }

    const membership = await this.financialAccounts.findAccessibleById(input.userId, context.financialAccountId);
    if (!membership) {
      return {
        account: await this.financialAccounts.ensurePersonalAccount(input.userId),
        role: 'owner' as const
      };
    }

    return membership;
  }

  private async requireMember(userId: string, financialAccountId: string) {
    const membership = await this.financialAccounts.findAccessibleById(userId, financialAccountId);
    if (!membership) {
      throw new Error('Financial account not found.');
    }
    return membership;
  }

  private async requireManager(userId: string, financialAccountId: string) {
    const membership = await this.requireMember(userId, financialAccountId);
    if (!['owner', 'admin'].includes(membership.role)) {
      throw new Error('You do not have permission to manage this financial account.');
    }
    return membership;
  }

  private requireSharedAccount(account: FinancialAccount) {
    if (account.type !== 'shared') {
      throw new Error('This operation is only available for shared accounts.');
    }
  }

  private now() {
    return this.invitationNotifications.now?.() ?? new Date();
  }

  private async deliverInvitationEmail(input: {
    invitation: FinancialAccountInvitation;
    account: FinancialAccount;
    inviterUserId: string;
  }) {
    const email = this.invitationNotifications.email;
    const origin = this.invitationNotifications.frontendPublicOrigin?.replace(/\/$/, '');
    if (!email || !origin) return input.invitation;

    const [inviter, recipient] = await Promise.all([
      this.users.findById(input.inviterUserId),
      this.users.findByEmail(input.invitation.email)
    ]);
    if (!inviter) return input.invitation;

    const acceptanceUrl = `${origin}/settings?accountInvitationToken=${encodeURIComponent(input.invitation.token)}`;
    const message = buildFinancialAccountInvitationEmail({
      accountName: input.account.name,
      inviter,
      recipient,
      acceptanceUrl,
      expiresAt: input.invitation.expiresAt
    });

    try {
      await email.send({ to: input.invitation.email, ...message });
      return await this.financialAccounts.markInvitationEmailSent(input.invitation.token, this.now().toISOString())
        ?? input.invitation;
    } catch (error) {
      const deliveryError = error instanceof Error ? error.message : 'Could not send invitation email.';
      return await this.financialAccounts.markInvitationEmailDeliveryFailed(input.invitation.token, deliveryError)
        ?? input.invitation;
    }
  }

  private async cloneScopeData(input: {
    tenantId: string;
    sourceFinancialAccountId: string;
    targetFinancialAccountId: string;
    currency: string;
  }) {
    await this.categories.ensureDefaults(input.tenantId);

    const [categories, targetScopeCategories, budgets, banks, paymentMethods] = await Promise.all([
      this.categories.listByTenant(input.tenantId, input.sourceFinancialAccountId),
      this.categories.listByTenant(input.tenantId, input.targetFinancialAccountId),
      this.budgets.listMonthly(input.tenantId, input.sourceFinancialAccountId),
      this.banks.listByTenant(input.tenantId, input.sourceFinancialAccountId),
      this.paymentMethods.listByTenant(input.tenantId, input.sourceFinancialAccountId)
    ]);

    const sourceScopedCategories = categories.filter((category) => category.financialAccountId === input.sourceFinancialAccountId);
    const sourceScopedCategoryMap = new Map(sourceScopedCategories.map((category) => [category.id, category]));
    const rootCategories = sourceScopedCategories.filter((category) => !category.parentId);
    const clonedCategoryIds = new Map<string, string>();
    const availableCategories = [...targetScopeCategories];

    for (const category of rootCategories) {
      const existing = resolveReusableCategory({
        category,
        availableCategories
      });
      if (existing) {
        clonedCategoryIds.set(category.id, existing.id);
        continue;
      }

      const created = await this.categories.create({
        tenantId: input.tenantId,
        financialAccountId: input.targetFinancialAccountId,
        name: category.name,
        isDefault: category.isDefault
      });
      clonedCategoryIds.set(category.id, created.id);
      availableCategories.push(created);
    }

    for (const category of sourceScopedCategories.filter((item) => item.parentId)) {
      const sourceParent = category.parentId ? sourceScopedCategoryMap.get(category.parentId) : undefined;
      const parentId = category.parentId ? clonedCategoryIds.get(category.parentId) : undefined;
      const existing = resolveReusableCategory({
        category,
        availableCategories,
        parentId,
        sourceParentName: sourceParent?.name
      });
      if (existing) {
        clonedCategoryIds.set(category.id, existing.id);
        continue;
      }

      const created = await this.categories.create({
        tenantId: input.tenantId,
        financialAccountId: input.targetFinancialAccountId,
        name: category.name,
        parentId,
        isDefault: category.isDefault
      });
      clonedCategoryIds.set(category.id, created.id);
      availableCategories.push(created);
    }

    const targetBanks = await this.banks.listByTenant(input.tenantId, input.targetFinancialAccountId);
    for (const bank of banks.filter((item) => item.financialAccountId === input.sourceFinancialAccountId && !item.isDefault)) {
      const exists = targetBanks.some((candidate) => normalizedKey(candidate.name) === normalizedKey(bank.name));
      if (exists) continue;
      await this.banks.create({
        tenantId: input.tenantId,
        financialAccountId: input.targetFinancialAccountId,
        name: bank.name,
        isDefault: false
      } satisfies Omit<BankOption, 'id'>);
      targetBanks.push({
        ...bank,
        id: `cloned-bank-${bank.id}`,
        financialAccountId: input.targetFinancialAccountId
      });
    }

    const targetPaymentMethods = await this.paymentMethods.listByTenant(input.tenantId, input.targetFinancialAccountId);
    for (const paymentMethod of paymentMethods.filter((item) => item.financialAccountId === input.sourceFinancialAccountId && !item.isDefault)) {
      const exists = targetPaymentMethods.some((candidate) =>
        normalizedKey(candidate.code) === normalizedKey(paymentMethod.code) ||
        (
          normalizedKey(candidate.name) === normalizedKey(paymentMethod.name) &&
          candidate.kind === paymentMethod.kind &&
          (candidate.cardType ?? '') === (paymentMethod.cardType ?? '')
        )
      );
      if (exists) continue;
      await this.paymentMethods.create({
        tenantId: input.tenantId,
        financialAccountId: input.targetFinancialAccountId,
        code: paymentMethod.code,
        name: paymentMethod.name,
        kind: paymentMethod.kind,
        cardType: paymentMethod.cardType,
        isDefault: false
      } satisfies Omit<PaymentMethodOption, 'id'>);
      targetPaymentMethods.push({
        ...paymentMethod,
        id: `cloned-method-${paymentMethod.id}`,
        financialAccountId: input.targetFinancialAccountId
      });
    }

    for (const budget of budgets.filter((item) => item.financialAccountId === input.sourceFinancialAccountId)) {
      await this.budgets.upsertMonthly({
        tenantId: input.tenantId,
        financialAccountId: input.targetFinancialAccountId,
        categoryId: clonedCategoryIds.get(budget.categoryId) ?? budget.categoryId,
        subcategoryId: budget.subcategoryId ? clonedCategoryIds.get(budget.subcategoryId) ?? budget.subcategoryId : undefined,
        amount: budget.amount,
        currency: budget.currency ?? input.currency
      } satisfies Omit<MonthlyBudget, 'id'>);
    }
  }
}

function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, '');
}

function resolveReusableCategory(input: {
  category: Category;
  availableCategories: Category[];
  parentId?: string;
  sourceParentName?: string;
}) {
  const targetParentId = input.parentId ?? undefined;
  return input.availableCategories.find((candidate) => {
    if (normalizedKey(candidate.name) !== normalizedKey(input.category.name)) {
      return false;
    }

    if ((candidate.parentId ?? undefined) !== targetParentId) {
      return false;
    }

    const candidateParent = candidate.parentId
      ? input.availableCategories.find((item) => item.id === candidate.parentId)
      : undefined;
    const parentMatches = normalizedKey(input.sourceParentName ?? '') === normalizedKey(candidateParent?.name ?? '');

    return !candidate.financialAccountId && (!input.sourceParentName || parentMatches);
  });
}

function normalizedKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function normalizeAccountName(value: string) {
  return normalizedKey(value);
}
