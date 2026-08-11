import { randomUUID } from 'node:crypto';
import type {
  BankOption,
  Category,
  FinancialAccount,
  FinancialAccountInvitation,
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

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export class FinancialAccountsUseCases {
  constructor(
    private readonly financialAccounts: FinancialAccountRepository,
    private readonly categories: CategoryRepository,
    private readonly budgets: BudgetRepository,
    private readonly banks: BankOptionRepository,
    private readonly paymentMethods: PaymentMethodOptionRepository,
    private readonly users: UserRepository
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
    sourceFinancialAccountId: string;
    name: string;
    currency: string;
  }) {
    const created = await this.financialAccounts.createSharedAccount({
      tenantId: input.tenantId,
      createdByUserId: input.userId,
      name: input.name,
      currency: input.currency
    });

    await this.cloneScopeData({
      tenantId: input.tenantId,
      sourceFinancialAccountId: input.sourceFinancialAccountId,
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

  async inviteMember(input: {
    actorUserId: string;
    financialAccountId: string;
    email: string;
    phoneNumber?: string;
    role: 'owner' | 'admin' | 'member';
  }) {
    await this.requireManager(input.actorUserId, input.financialAccountId);
    const invitation = await this.financialAccounts.createInvitation({
      financialAccountId: input.financialAccountId,
      invitedByUserId: input.actorUserId,
      email: input.email,
      phoneNumber: input.phoneNumber,
      role: input.role,
      token: randomUUID(),
      expiresAt: new Date(Date.now() + INVITATION_TTL_MS).toISOString()
    });
    return invitation;
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

  private async cloneScopeData(input: {
    tenantId: string;
    sourceFinancialAccountId: string;
    targetFinancialAccountId: string;
    currency: string;
  }) {
    const [categories, budgets, banks, paymentMethods] = await Promise.all([
      this.categories.listByTenant(input.tenantId, input.sourceFinancialAccountId),
      this.budgets.listMonthly(input.tenantId, input.sourceFinancialAccountId),
      this.banks.listByTenant(input.tenantId, input.sourceFinancialAccountId),
      this.paymentMethods.listByTenant(input.tenantId, input.sourceFinancialAccountId)
    ]);

    const rootCategories = categories.filter((category) => !category.parentId && category.financialAccountId === input.sourceFinancialAccountId);
    const clonedCategoryIds = new Map<string, string>();

    for (const category of rootCategories) {
      const created = await this.categories.create({
        tenantId: input.tenantId,
        financialAccountId: input.targetFinancialAccountId,
        name: category.name,
        isDefault: category.isDefault
      });
      clonedCategoryIds.set(category.id, created.id);
    }

    for (const category of categories.filter((item) => item.parentId && item.financialAccountId === input.sourceFinancialAccountId)) {
      const parentId = category.parentId ? clonedCategoryIds.get(category.parentId) : undefined;
      const created = await this.categories.create({
        tenantId: input.tenantId,
        financialAccountId: input.targetFinancialAccountId,
        name: category.name,
        parentId,
        isDefault: category.isDefault
      });
      clonedCategoryIds.set(category.id, created.id);
    }

    for (const bank of banks.filter((item) => item.financialAccountId === input.sourceFinancialAccountId && !item.isDefault)) {
      await this.banks.create({
        tenantId: input.tenantId,
        financialAccountId: input.targetFinancialAccountId,
        name: bank.name,
        isDefault: false
      } satisfies Omit<BankOption, 'id'>);
    }

    for (const paymentMethod of paymentMethods.filter((item) => item.financialAccountId === input.sourceFinancialAccountId && !item.isDefault)) {
      await this.paymentMethods.create({
        tenantId: input.tenantId,
        financialAccountId: input.targetFinancialAccountId,
        code: paymentMethod.code,
        name: paymentMethod.name,
        kind: paymentMethod.kind,
        cardType: paymentMethod.cardType,
        isDefault: false
      } satisfies Omit<PaymentMethodOption, 'id'>);
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

function normalizeAccountName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}
