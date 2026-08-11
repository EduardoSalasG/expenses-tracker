import { randomUUID } from 'node:crypto';
import type {
  BankOptionRepository,
  BudgetRepository,
  CategoryRepository,
  EmailMagicLinkTokenRepository,
  ExpenseRepository,
  FinancialAccountMembershipRecord,
  FinancialAccountRepository,
  IncomeRepository,
  MessagingMessageAuditRepository,
  MessagingPendingDraftRepository,
  OtpRepository,
  PaymentMethodOptionRepository,
  RegistrationLeadRepository,
  ReportDispatchRepository,
  TelegramLinkTokenRepository,
  UserRepository,
  CategoryTotalByPeriod,
  CurrencyTotalByPeriod
} from '../../application/ports.js';
import type {
  BankOption,
  Category,
  ConversationPendingDraft,
  Expense,
  FinancialAccount,
  FinancialAccountInvitation,
  FinancialAccountMemberBalance,
  FinancialAccountMember,
  FinancialAccountMemberProfile,
  FinancialAccountSettlement,
  Income,
  MessagingChannelContext,
  MonthlyBudget,
  PaymentMethodOption,
  RegistrationLead,
  ReportFrequency,
  User,
  UserAuthRecord
} from '../../domain/index.js';

export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();
  private readonly passwordHashes = new Map<string, string>();

  async findByPhoneNumber(phoneNumber: string) {
    return [...this.users.values()].find((user) => user.phoneNumber === phoneNumber);
  }

  async findAuthByPhoneNumber(phoneNumber: string): Promise<UserAuthRecord | undefined> {
    const user = await this.findByPhoneNumber(phoneNumber);
    if (!user) return undefined;
    return { user, passwordHash: this.passwordHashes.get(user.id) };
  }

  async findByTelegramChatId(chatId: string) {
    return [...this.users.values()].find((user) => user.telegramChatId === chatId);
  }

  async findById(userId: string) {
    return this.users.get(userId);
  }

  async listByReportFrequency(frequency: ReportFrequency) {
    return [...this.users.values()].filter((user) => user.reportPreferences.includes(frequency));
  }

  async upsertByPhoneNumber(input: Omit<User, 'id' | 'tenantId' | 'role' | 'reportPreferences'>) {
    const existing = await this.findByPhoneNumber(input.phoneNumber);
    if (existing) {
      const updated = { ...existing, ...input };
      this.users.set(updated.id, updated);
      return updated;
    }

    const user: User = {
      ...input,
      id: randomUUID(),
      tenantId: randomUUID(),
      role: 'consumer',
      reportPreferences: ['monthly']
    };
    this.users.set(user.id, user);
    return user;
  }

  async setPasswordHash(userId: string, passwordHash: string) {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found.');
    this.passwordHashes.set(userId, passwordHash);
    return user;
  }

  async linkTelegramChatByPhone(phoneNumber: string, chatId: string, username?: string) {
    const user = await this.findByPhoneNumber(phoneNumber);
    if (!user) return undefined;
    const updated: User = { ...user, telegramChatId: chatId, telegramUsername: username ?? user.telegramUsername };
    this.users.set(updated.id, updated);
    return updated;
  }

  async updateProfile(userId: string, input: Pick<User, 'firstName' | 'lastName' | 'preferredName' | 'email' | 'countryOfResidence' | 'preferredCurrency' | 'preferredLanguage'>) {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found.');
    const updated = { ...user, ...input };
    this.users.set(userId, updated);
    return updated;
  }

  async updateReportPreferences(userId: string, preferences: ReportFrequency[]) {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found.');
    const updated = { ...user, reportPreferences: preferences };
    this.users.set(userId, updated);
    return updated;
  }
}

export class InMemoryRegistrationLeadRepository implements RegistrationLeadRepository {
  private readonly leads = new Map<string, RegistrationLead>();

  async upsertStarted(input: {
    firstName: string;
    email: string;
    preferredLanguage?: 'es' | 'en';
    phoneNumber?: string;
  }) {
    const key = input.email.trim().toLowerCase();
    const now = new Date().toISOString();
    const existing = this.leads.get(key);
    const lead: RegistrationLead = existing
      ? {
          ...existing,
          firstName: input.firstName,
          preferredLanguage: input.preferredLanguage ?? existing.preferredLanguage,
          phoneNumber: input.phoneNumber ?? existing.phoneNumber,
          status: existing.status === 'completed' ? 'completed' : 'started',
          updatedAt: now
        }
      : {
          id: randomUUID(),
          firstName: input.firstName,
          email: input.email,
          preferredLanguage: input.preferredLanguage ?? 'es',
          phoneNumber: input.phoneNumber,
          status: 'started',
          createdAt: now,
          updatedAt: now
        };

    this.leads.set(key, lead);
    return lead;
  }

  async markCompletedByEmail(email: string, phoneNumber?: string) {
    const key = email.trim().toLowerCase();
    const existing = this.leads.get(key);
    if (!existing) return;
    const now = new Date().toISOString();
    this.leads.set(key, {
      ...existing,
      phoneNumber: phoneNumber ?? existing.phoneNumber,
      status: 'completed',
      completedAt: now,
      updatedAt: now
    });
  }
}

export class InMemoryFinancialAccountRepository implements FinancialAccountRepository {
  private readonly accounts = new Map<string, FinancialAccount>();
  private readonly members: FinancialAccountMember[] = [];
  private readonly invitations = new Map<string, FinancialAccountInvitation>();
  private readonly messagingContexts = new Map<string, MessagingChannelContext>();
  private readonly settlements = new Map<string, FinancialAccountSettlement>();

  constructor(
    private readonly users?: UserRepository,
    private readonly expenseReader?: Pick<InMemoryExpenseRepository, 'listAllByFinancialAccount'>
  ) {}

  async ensurePersonalAccount(userId: string) {
    const existing = [...this.accounts.values()].find((account) => account.createdByUserId === userId && account.type === 'personal');
    if (existing) {
      if (!this.members.some((member) => member.financialAccountId === existing.id && member.userId === userId && member.status === 'active')) {
        this.members.push(this.buildMember(existing.id, userId, 'owner', 'active', new Date().toISOString()));
      }
      return existing;
    }

    const account: FinancialAccount = {
      id: randomUUID(),
      tenantId: userId,
      type: 'personal',
      name: 'Personal',
      currency: 'CLP',
      createdByUserId: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.accounts.set(account.id, account);
    this.members.push(this.buildMember(account.id, userId, 'owner', 'active', new Date().toISOString()));
    return account;
  }

  async findAccessibleById(userId: string, financialAccountId: string) {
    await this.ensurePersonalAccount(userId);
    const account = this.accounts.get(financialAccountId);
    const member = this.members.find((membership) =>
      membership.financialAccountId === financialAccountId &&
      membership.userId === userId &&
      membership.status === 'active'
    );
    return account && member ? { account, role: member.role } : undefined;
  }

  async listAccessibleByUser(userId: string) {
    await this.ensurePersonalAccount(userId);
    return this.members
      .filter((member) => member.userId === userId && member.status === 'active')
      .map((member) => {
        const account = this.accounts.get(member.financialAccountId);
        return account ? { account, role: member.role } : undefined;
      })
      .filter((membership): membership is FinancialAccountMembershipRecord => Boolean(membership));
  }

  async findById(financialAccountId: string) {
    return this.accounts.get(financialAccountId);
  }

  async createSharedAccount(input: {
    tenantId: string;
    createdByUserId: string;
    name: string;
    currency: string;
  }) {
    const account: FinancialAccount = {
      id: randomUUID(),
      tenantId: input.tenantId,
      type: 'shared',
      name: input.name,
      currency: input.currency,
      createdByUserId: input.createdByUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const membership = { account, role: 'owner' as const };
    this.accounts.set(account.id, account);
    this.members.push(this.buildMember(account.id, input.createdByUserId, 'owner', 'active', new Date().toISOString()));
    return membership;
  }

  async updateSharedAccountName(input: { financialAccountId: string; name: string }) {
    const account = this.accounts.get(input.financialAccountId);
    if (!account || account.type !== 'shared') return undefined;
    const updated = { ...account, name: input.name, updatedAt: new Date().toISOString() };
    this.accounts.set(updated.id, updated);
    return updated;
  }

  async listMembers(financialAccountId: string) {
    const users = await Promise.all(this.members
      .filter((member) => member.financialAccountId === financialAccountId)
      .map(async (member) => {
        const user = await this.users?.findById(member.userId);
        return this.buildMemberProfile(member, user);
      }));
    return users;
  }

  async findMember(financialAccountId: string, userId: string) {
    return this.members.find((member) => member.financialAccountId === financialAccountId && member.userId === userId);
  }

  async upsertMember(input: {
    financialAccountId: string;
    userId: string;
    role: 'owner' | 'admin' | 'member';
    status: 'active' | 'invited' | 'removed';
    joinedAt?: string;
  }) {
    const existingIndex = this.members.findIndex((member) => member.financialAccountId === input.financialAccountId && member.userId === input.userId);
    const member = this.buildMember(input.financialAccountId, input.userId, input.role, input.status, input.joinedAt, existingIndex >= 0 ? this.members[existingIndex].id : undefined);
    if (existingIndex >= 0) {
      this.members[existingIndex] = { ...member, createdAt: this.members[existingIndex].createdAt };
    } else {
      this.members.push(member);
    }
    return existingIndex >= 0 ? this.members[existingIndex] : member;
  }

  async removeMember(financialAccountId: string, userId: string) {
    const existingIndex = this.members.findIndex((member) => member.financialAccountId === financialAccountId && member.userId === userId);
    if (existingIndex < 0) return false;
    this.members[existingIndex] = {
      ...this.members[existingIndex],
      status: 'removed',
      updatedAt: new Date().toISOString()
    };
    return true;
  }

  async countActiveOwners(financialAccountId: string) {
    return this.members.filter((member) =>
      member.financialAccountId === financialAccountId &&
      member.status === 'active' &&
      member.role === 'owner'
    ).length;
  }

  async listBalances(financialAccountId: string) {
    const account = this.accounts.get(financialAccountId);
    if (!account) return [];

    const expenses = await this.expenseReader?.listAllByFinancialAccount(financialAccountId) ?? [];
    const balances = new Map<string, number>();

    for (const expense of expenses) {
      if (!expense.allocations?.length || !expense.paidByUserId) continue;
      for (const allocation of expense.allocations) {
        if (allocation.owedByUserId === expense.paidByUserId) continue;
        balances.set(allocation.owedByUserId, roundMoney((balances.get(allocation.owedByUserId) ?? 0) - allocation.amount));
        balances.set(expense.paidByUserId, roundMoney((balances.get(expense.paidByUserId) ?? 0) + allocation.amount));
      }
    }

    for (const settlement of [...this.settlements.values()].filter((item) => item.financialAccountId === financialAccountId)) {
      balances.set(settlement.paidByUserId, roundMoney((balances.get(settlement.paidByUserId) ?? 0) + settlement.amount));
      balances.set(settlement.receivedByUserId, roundMoney((balances.get(settlement.receivedByUserId) ?? 0) - settlement.amount));
    }

    const members = await this.listMembers(financialAccountId);
    return members
      .filter((member) => member.status === 'active')
      .map((member) => ({
        financialAccountId,
        userId: member.userId,
        firstName: member.firstName,
        lastName: member.lastName,
        preferredName: member.preferredName,
        currency: account.currency,
        netAmount: roundMoney(balances.get(member.userId) ?? 0)
      } satisfies FinancialAccountMemberBalance));
  }

  async listSettlements(financialAccountId: string) {
    return [...this.settlements.values()]
      .filter((settlement) => settlement.financialAccountId === financialAccountId)
      .sort((left, right) => right.settledAt.localeCompare(left.settledAt) || right.createdAt.localeCompare(left.createdAt));
  }

  async createSettlement(input: {
    financialAccountId: string;
    recordedByUserId: string;
    paidByUserId: string;
    receivedByUserId: string;
    currency: string;
    amount: number;
    settledAt: string;
    note?: string;
  }) {
    const [payer, receiver, recorder] = await Promise.all([
      this.users?.findById(input.paidByUserId),
      this.users?.findById(input.receivedByUserId),
      this.users?.findById(input.recordedByUserId)
    ]);
    const now = new Date().toISOString();
    const settlement: FinancialAccountSettlement = {
      id: randomUUID(),
      financialAccountId: input.financialAccountId,
      recordedByUserId: input.recordedByUserId,
      paidByUserId: input.paidByUserId,
      receivedByUserId: input.receivedByUserId,
      currency: input.currency,
      amount: roundMoney(input.amount),
      settledAt: input.settledAt,
      note: input.note,
      createdAt: now,
      updatedAt: now,
      paidByPreferredName: payer?.preferredName,
      receivedByPreferredName: receiver?.preferredName,
      recordedByPreferredName: recorder?.preferredName
    };
    this.settlements.set(settlement.id, settlement);
    return settlement;
  }

  async createInvitation(input: {
    financialAccountId: string;
    invitedByUserId?: string;
    email: string;
    phoneNumber?: string;
    role: 'owner' | 'admin' | 'member';
    token: string;
    expiresAt: string;
  }) {
    const invitation: FinancialAccountInvitation = {
      id: randomUUID(),
      financialAccountId: input.financialAccountId,
      invitedByUserId: input.invitedByUserId,
      email: input.email.trim().toLowerCase(),
      phoneNumber: input.phoneNumber,
      role: input.role,
      token: input.token,
      status: 'pending',
      expiresAt: input.expiresAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.invitations.set(invitation.token, invitation);
    return invitation;
  }

  async findPendingInvitationByToken(token: string, now: string) {
    const invitation = this.invitations.get(token);
    if (!invitation || invitation.status !== 'pending' || invitation.expiresAt < now) return undefined;
    return invitation;
  }

  async markInvitationAccepted(token: string, acceptedAt: string) {
    const invitation = this.invitations.get(token);
    if (!invitation) return;
    this.invitations.set(token, {
      ...invitation,
      status: 'accepted',
      acceptedAt,
      updatedAt: acceptedAt
    });
  }

  async findMessagingContext(channel: 'whatsapp' | 'telegram', providerUserId: string) {
    return this.messagingContexts.get(`${channel}:${providerUserId}`);
  }

  async upsertMessagingContext(input: {
    channel: 'whatsapp' | 'telegram';
    providerUserId: string;
    userId: string;
    financialAccountId: string;
  }) {
    const key = `${input.channel}:${input.providerUserId}`;
    const existing = this.messagingContexts.get(key);
    const context: MessagingChannelContext = {
      id: existing?.id ?? randomUUID(),
      channel: input.channel,
      providerUserId: input.providerUserId,
      userId: input.userId,
      financialAccountId: input.financialAccountId,
      updatedAt: new Date().toISOString()
    };
    this.messagingContexts.set(key, context);
    return context;
  }

  private buildMember(
    financialAccountId: string,
    userId: string,
    role: FinancialAccountMember['role'],
    status: FinancialAccountMember['status'],
    joinedAt?: string,
    id: string = randomUUID()
  ): FinancialAccountMember {
    const now = new Date().toISOString();
    return {
      id,
      financialAccountId,
      userId,
      role,
      status,
      joinedAt,
      createdAt: now,
      updatedAt: now
    };
  }

  private buildMemberProfile(member: FinancialAccountMember, user?: User): FinancialAccountMemberProfile {
    return {
      memberId: member.id,
      financialAccountId: member.financialAccountId,
      userId: member.userId,
      role: member.role,
      status: member.status,
      joinedAt: member.joinedAt,
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      preferredName: user?.preferredName ?? '',
      email: user?.email,
      phoneNumber: user?.phoneNumber ?? ''
    };
  }
}

export class InMemoryOtpRepository implements OtpRepository {
  private readonly otps = new Map<string, { code: string; expiresAt: Date }>();

  async create(phoneNumber: string, code: string, expiresAt: Date) {
    this.otps.set(phoneNumber, { code, expiresAt });
  }

  async verify(phoneNumber: string, code: string, now: Date) {
    const otp = this.otps.get(phoneNumber);
    const valid = Boolean(otp && otp.code === code && otp.expiresAt >= now);
    if (valid) this.otps.delete(phoneNumber);
    return valid;
  }
}

export class InMemoryCategoryRepository implements CategoryRepository {
  private readonly categories: Category[] = [];

  async listByTenant(tenantId: string, financialAccountId?: string) {
    return this.categories.filter((category) =>
      category.tenantId === tenantId &&
      (!financialAccountId || !category.financialAccountId || category.financialAccountId === financialAccountId)
    );
  }

  async create(input: Omit<Category, 'id'>) {
    const category = { ...input, id: randomUUID() };
    this.categories.push(category);
    return category;
  }

  async ensureDefaults(tenantId: string) {
    if ((await this.listByTenant(tenantId)).length > 0) return;
    const roots = new Map<string, Category>();
    for (const root of DEFAULT_CATEGORY_TREE) {
      const category = await this.create({ tenantId, name: root.name, isDefault: true });
      roots.set(root.name, category);
    }

    for (const root of DEFAULT_CATEGORY_TREE) {
      const parent = roots.get(root.name);
      if (!parent) continue;
      for (const subcategory of root.subcategories) {
        await this.create({ tenantId, name: subcategory, parentId: parent.id, isDefault: true });
      }
    }
  }
}

const DEFAULT_CATEGORY_TREE = [
  { name: 'Food', subcategories: ['Groceries', 'Restaurants'] },
  { name: 'Transport', subcategories: ['Public Transport', 'Uber'] },
  { name: 'Housing', subcategories: ['Rent'] },
  { name: 'Health', subcategories: ['Appointments', 'Medicines', 'Procedures', 'Sports'] },
  { name: 'Entertainment', subcategories: ['Theater'] },
  { name: 'Education', subcategories: ['Work'] },
  { name: 'Services', subcategories: ['Phone'] },
  { name: 'Other', subcategories: ['Gifts'] }
];

const DEFAULT_BANK_OPTIONS = [
  'Banco de Chile',
  'Banco Internacional',
  'Scotiabank Chile',
  'Banco de Crédito e Inversiones',
  'Banco BICE',
  'Banco Santander-Chile',
  'Banco Itaú Chile',
  'Banco Falabella',
  'Banco Ripley',
  'Banco Consorcio',
  'Tanner Banco Digital',
  'Tenpo Bank Chile',
  'Banco del Estado de Chile'
];

export class InMemoryBankOptionRepository implements BankOptionRepository {
  private readonly banks: BankOption[] = DEFAULT_BANK_OPTIONS.map((name) => ({ id: randomUUID(), name, isDefault: true }));

  async listByTenant(tenantId: string, financialAccountId?: string) {
    return this.banks.filter((bank) =>
      (!bank.tenantId || bank.tenantId === tenantId) &&
      (!financialAccountId || !bank.financialAccountId || bank.financialAccountId === financialAccountId)
    );
  }

  async findAccessibleById(tenantId: string, bankOptionId: string, financialAccountId?: string) {
    return this.banks.find((bank) =>
      bank.id === bankOptionId &&
      (!bank.tenantId || bank.tenantId === tenantId) &&
      (!financialAccountId || !bank.financialAccountId || bank.financialAccountId === financialAccountId)
    );
  }

  async create(input: Omit<BankOption, 'id'>) {
    const bank = { ...input, id: randomUUID() };
    this.banks.push(bank);
    return bank;
  }

  async update(input: { tenantId: string; bankOptionId: string; name: string }) {
    const index = this.banks.findIndex((bank) => bank.id === input.bankOptionId && bank.tenantId === input.tenantId && !bank.isDefault);
    if (index < 0) return undefined;
    this.banks[index] = { ...this.banks[index], name: input.name };
    return this.banks[index];
  }

  async delete(input: { tenantId: string; bankOptionId: string }) {
    const index = this.banks.findIndex((bank) => bank.id === input.bankOptionId && bank.tenantId === input.tenantId && !bank.isDefault);
    if (index < 0) return false;
    this.banks.splice(index, 1);
    return true;
  }
}

export class InMemoryPaymentMethodOptionRepository implements PaymentMethodOptionRepository {
  private readonly paymentMethods: PaymentMethodOption[] = [
    { id: randomUUID(), name: 'Transferencia', code: 'transfer', kind: 'transfer', isDefault: true },
    { id: randomUUID(), name: 'Tarjeta de débito', code: 'debit_card', kind: 'card', cardType: 'debit', isDefault: true },
    { id: randomUUID(), name: 'Tarjeta de crédito', code: 'credit_card', kind: 'card', cardType: 'credit', isDefault: true },
    { id: randomUUID(), name: 'Efectivo', code: 'cash', kind: 'cash', isDefault: true }
  ];

  async listByTenant(tenantId: string, financialAccountId?: string) {
    return this.paymentMethods.filter((method) =>
      (!method.tenantId || method.tenantId === tenantId) &&
      (!financialAccountId || !method.financialAccountId || method.financialAccountId === financialAccountId)
    );
  }

  async findAccessibleById(tenantId: string, paymentMethodOptionId: string, financialAccountId?: string) {
    return this.paymentMethods.find((method) =>
      method.id === paymentMethodOptionId &&
      (!method.tenantId || method.tenantId === tenantId) &&
      (!financialAccountId || !method.financialAccountId || method.financialAccountId === financialAccountId)
    );
  }

  async create(input: Omit<PaymentMethodOption, 'id'>) {
    const method = { ...input, id: randomUUID() };
    this.paymentMethods.push(method);
    return method;
  }

  async update(input: {
    tenantId: string;
    paymentMethodOptionId: string;
    code: string;
    name: string;
    kind: PaymentMethodOption['kind'];
    cardType?: PaymentMethodOption['cardType'];
  }) {
    const index = this.paymentMethods.findIndex((method) => method.id === input.paymentMethodOptionId && method.tenantId === input.tenantId && !method.isDefault);
    if (index < 0) return undefined;
    this.paymentMethods[index] = {
      ...this.paymentMethods[index],
      code: input.code,
      name: input.name,
      kind: input.kind,
      cardType: input.cardType
    };
    return this.paymentMethods[index];
  }

  async delete(input: { tenantId: string; paymentMethodOptionId: string }) {
    const index = this.paymentMethods.findIndex((method) => method.id === input.paymentMethodOptionId && method.tenantId === input.tenantId && !method.isDefault);
    if (index < 0) return false;
    this.paymentMethods.splice(index, 1);
    return true;
  }
}

export class InMemoryExpenseRepository implements ExpenseRepository {
  private readonly expenses: Expense[] = [];

  async listAllByFinancialAccount(financialAccountId: string) {
    return this.expenses
      .filter((expense) => expense.financialAccountId === financialAccountId)
      .map((expense) => ({
        ...expense,
        allocations: expense.allocations?.map((allocation) => ({ ...allocation }))
      }));
  }

  async create(input: Omit<Expense, 'id'>) {
    const installmentCount = Math.max(1, input.installmentCount ?? 1);
    const purchaseDate = input.purchaseDate ?? input.date;
    const firstInstallmentDate = input.firstInstallmentDate ?? input.date;
    const expense = {
      ...input,
      id: randomUUID(),
      allocations: input.allocations?.map((allocation) => ({
        id: randomUUID(),
        expenseId: '',
        owedByUserId: allocation.owedByUserId,
        amount: allocation.amount
      })),
      purchaseDate,
      firstInstallmentDate,
      installmentCount
    };
    expense.allocations = expense.allocations?.map((allocation) => ({ ...allocation, expenseId: expense.id }));
    this.expenses.push(expense);
    return buildProjectedExpenses(expense)[0];
  }

  async findById(input: { tenantId: string; financialAccountId?: string; expenseId: string }) {
    const expense = this.expenses.find((item) =>
      item.tenantId === input.tenantId &&
      item.id === input.expenseId &&
      (!input.financialAccountId || !item.financialAccountId || item.financialAccountId === input.financialAccountId)
    );
    return expense ? buildProjectedExpenses(expense)[0] : undefined;
  }

  async delete(input: { tenantId: string; financialAccountId?: string; expenseId: string }) {
    const index = this.expenses.findIndex((expense) =>
      expense.tenantId === input.tenantId &&
      expense.id === input.expenseId &&
      (!input.financialAccountId || !expense.financialAccountId || expense.financialAccountId === input.financialAccountId)
    );
    if (index === -1) return false;
    this.expenses.splice(index, 1);
    return true;
  }

  async update(input: {
    tenantId: string;
    financialAccountId?: string;
    expenseId: string;
    date?: string;
    amount?: number;
    currency?: string;
    concept?: string;
    categoryId?: string;
    subcategoryId?: string | null;
    paymentMethodOptionId?: string | null;
    bankOptionId?: string | null;
    paidByUserId?: string;
    allocationMode?: Expense['allocationMode'];
    allocations?: Array<{ owedByUserId: string; amount: number }>;
    installmentCount?: number;
    firstInstallmentDate?: string | null;
    paymentMethod?: Expense['paymentMethod'];
  }) {
    const index = this.expenses.findIndex((expense) =>
      expense.tenantId === input.tenantId &&
      expense.id === input.expenseId &&
      (!input.financialAccountId || !expense.financialAccountId || expense.financialAccountId === input.financialAccountId)
    );
    if (index < 0) return undefined;
    const purchaseDate = input.date ?? this.expenses[index].purchaseDate ?? this.expenses[index].date;
    const firstInstallmentDate = Object.prototype.hasOwnProperty.call(input, 'firstInstallmentDate')
      ? input.firstInstallmentDate ?? purchaseDate
      : this.expenses[index].firstInstallmentDate ?? purchaseDate;
    this.expenses[index] = {
      ...this.expenses[index],
      date: purchaseDate,
      purchaseDate,
      amount: input.amount ?? this.expenses[index].amount,
      currency: input.currency ?? this.expenses[index].currency,
      concept: input.concept ?? this.expenses[index].concept,
      categoryId: input.categoryId ?? this.expenses[index].categoryId,
      installmentCount: input.installmentCount ?? this.expenses[index].installmentCount ?? 1,
      firstInstallmentDate,
      paymentMethodOptionId: Object.prototype.hasOwnProperty.call(input, 'paymentMethodOptionId')
        ? input.paymentMethodOptionId ?? undefined
        : this.expenses[index].paymentMethodOptionId,
      bankOptionId: Object.prototype.hasOwnProperty.call(input, 'bankOptionId')
        ? input.bankOptionId ?? undefined
        : this.expenses[index].bankOptionId,
      paymentMethod: input.paymentMethod ?? this.expenses[index].paymentMethod,
      paidByUserId: Object.prototype.hasOwnProperty.call(input, 'paidByUserId')
        ? input.paidByUserId ?? undefined
        : this.expenses[index].paidByUserId,
      allocationMode: Object.prototype.hasOwnProperty.call(input, 'allocationMode')
        ? input.allocationMode ?? undefined
        : this.expenses[index].allocationMode,
      allocations: Object.prototype.hasOwnProperty.call(input, 'allocations')
        ? input.allocations?.map((allocation) => ({
          id: randomUUID(),
          expenseId: this.expenses[index].id,
          owedByUserId: allocation.owedByUserId,
          amount: allocation.amount
        }))
        : this.expenses[index].allocations,
      subcategoryId: Object.prototype.hasOwnProperty.call(input, 'subcategoryId')
        ? input.subcategoryId ?? undefined
        : this.expenses[index].subcategoryId
    };
    return buildProjectedExpenses(this.expenses[index])[0];
  }

  async list(input: {
    tenantId: string;
    financialAccountId?: string;
    from?: string;
    to?: string;
    categoryId?: string;
    currency?: string;
    paymentMethodKind?: 'cash' | 'card' | 'transfer';
    limit: number;
  }) {
    return this.projectedExpenses()
      .filter((expense) => expense.tenantId === input.tenantId)
      .filter((expense) => !input.financialAccountId || !expense.financialAccountId || expense.financialAccountId === input.financialAccountId)
      .filter((expense) => !input.from || expense.date >= input.from)
      .filter((expense) => !input.to || expense.date <= input.to)
      .filter((expense) => !input.categoryId || expense.categoryId === input.categoryId || expense.subcategoryId === input.categoryId)
      .filter((expense) => !input.currency || expense.currency === input.currency)
      .filter((expense) => !input.paymentMethodKind || expense.paymentMethod.kind === input.paymentMethodKind)
      .sort(sortProjectedExpenses)
      .slice(0, input.limit);
  }

  async listRecent(tenantId: string, financialAccountIdOrLimit?: string | number, limitMaybe?: number) {
    const { financialAccountId, limit } = normalizeScopedRecentArgs(financialAccountIdOrLimit, limitMaybe);
    return this.projectedExpenses()
      .filter((expense) => expense.tenantId === tenantId)
      .filter((expense) => !financialAccountId || !expense.financialAccountId || expense.financialAccountId === financialAccountId)
      .sort(sortProjectedExpenses)
      .slice(0, limit);
  }

  async listByPeriod(tenantId: string, financialAccountIdOrFrom: string, fromOrTo?: string, toMaybe?: string) {
    const { financialAccountId, from, to } = normalizeScopedPeriodArgs(financialAccountIdOrFrom, fromOrTo, toMaybe);
    const normalizedFrom = from ?? '';
    const normalizedTo = to ?? '';
    return this.projectedExpenses().filter((expense) =>
      expense.tenantId === tenantId &&
      (!financialAccountId || !expense.financialAccountId || expense.financialAccountId === financialAccountId) &&
      expense.date >= normalizedFrom &&
      expense.date <= normalizedTo
    );
  }

  async yearlyMonthlyTotalsByTenant(tenantId: string, financialAccountId: string | undefined, year: number) {
    const source = this.projectedExpenses().filter((expense) =>
      expense.tenantId === tenantId &&
      (!financialAccountId || !expense.financialAccountId || expense.financialAccountId === financialAccountId) &&
      new Date(expense.date).getUTCFullYear() === year
    );
    return aggregateCurrencyTotalsBy(source, (expense) => {
      const date = new Date(expense.date);
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    });
  }

  async monthlyDailyTotalsByTenant(tenantId: string, financialAccountId: string | undefined, month: string) {
    const [year, monthNumber] = month.split('-').map(Number);
    const source = this.projectedExpenses().filter((expense) => {
      if (expense.tenantId !== tenantId) return false;
      if (financialAccountId && expense.financialAccountId && expense.financialAccountId !== financialAccountId) return false;
      const date = new Date(expense.date);
      return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === monthNumber;
    });
    return aggregateCurrencyTotalsBy(source, (expense) => {
      const date = new Date(expense.date);
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
    });
  }

  async weeklyDailyTotalsByTenant(tenantId: string, financialAccountId: string | undefined, weekStartIsoDate: string) {
    const weekStart = new Date(`${weekStartIsoDate}T00:00:00.000Z`);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    weekEnd.setUTCHours(23, 59, 59, 999);
    const source = this.projectedExpenses().filter((expense) => {
      if (expense.tenantId !== tenantId) return false;
      if (financialAccountId && expense.financialAccountId && expense.financialAccountId !== financialAccountId) return false;
      const date = new Date(expense.date);
      return date >= weekStart && date <= weekEnd;
    });
    return aggregateCurrencyTotalsBy(source, (expense) => {
      const date = new Date(expense.date);
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
    });
  }

  async periodCategoryTotalsByTenant(tenantId: string, financialAccountId: string | undefined, from: string, to: string) {
    const totals = new Map<string, CategoryTotalByPeriod>();
    for (const expense of this.projectedExpenses()) {
      if (expense.tenantId !== tenantId) continue;
      if (financialAccountId && expense.financialAccountId && expense.financialAccountId !== financialAccountId) continue;
      if (expense.date < from || expense.date > to) continue;
      const key = [expense.categoryId, expense.subcategoryId ?? '', expense.currency].join('__');
      const existing = totals.get(key);
      if (existing) {
        existing.total += Number(expense.amount);
        continue;
      }
      totals.set(key, {
        categoryId: expense.categoryId,
        subcategoryId: expense.subcategoryId,
        currency: expense.currency,
        total: Number(expense.amount)
      });
    }
    return [...totals.values()];
  }

  async upcomingInstallmentsMonthlyTotalsByTenant(
    tenantId: string,
    financialAccountIdOrStartMonth: string,
    startMonthOrMonths?: string | number,
    monthsMaybe?: number
  ) {
    const { financialAccountId, startMonth, months } = normalizeScopedUpcomingArgs(
      financialAccountIdOrStartMonth,
      startMonthOrMonths,
      monthsMaybe
    );
    const normalizedStartMonth = startMonth || '1970-01';
    const [year, month] = normalizedStartMonth.split('-').map(Number);
    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year, month - 1 + Math.max(1, months), 1, 0, 0, 0));
    const source = this.projectedExpenses().filter((expense) => {
      if (expense.tenantId !== tenantId) return false;
      if (financialAccountId && expense.financialAccountId && expense.financialAccountId !== financialAccountId) return false;
      if ((expense.installmentCount ?? 1) <= 1) return false;
      const date = new Date(expense.date);
      return date >= start && date < end;
    });
    return aggregateCurrencyTotalsBy(source, (expense) => {
      const date = new Date(expense.date);
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    });
  }

  private projectedExpenses() {
    return this.expenses.flatMap((expense) => buildProjectedExpenses(expense));
  }
}

export class InMemoryIncomeRepository implements IncomeRepository {
  private readonly incomes: Income[] = [];

  async create(input: Omit<Income, 'id'>) {
    const income = { ...input, id: randomUUID() };
    this.incomes.push(income);
    return income;
  }

  async delete(input: { tenantId: string; financialAccountId?: string; incomeId: string }) {
    const index = this.incomes.findIndex((income) =>
      income.tenantId === input.tenantId &&
      income.id === input.incomeId &&
      (!input.financialAccountId || !income.financialAccountId || income.financialAccountId === input.financialAccountId)
    );
    if (index === -1) return false;
    this.incomes.splice(index, 1);
    return true;
  }

  async update(input: {
    tenantId: string;
    financialAccountId?: string;
    incomeId: string;
    date?: string;
    amount?: number;
    currency?: string;
    concept?: string;
  }) {
    const index = this.incomes.findIndex((income) =>
      income.tenantId === input.tenantId &&
      income.id === input.incomeId &&
      (!input.financialAccountId || !income.financialAccountId || income.financialAccountId === input.financialAccountId)
    );
    if (index < 0) return undefined;
    this.incomes[index] = {
      ...this.incomes[index],
      date: input.date ?? this.incomes[index].date,
      amount: input.amount ?? this.incomes[index].amount,
      currency: input.currency ?? this.incomes[index].currency,
      concept: input.concept ?? this.incomes[index].concept
    };
    return this.incomes[index];
  }

  async list(input: {
    tenantId: string;
    financialAccountId?: string;
    from?: string;
    to?: string;
    currency?: string;
    limit: number;
  }) {
    return this.incomes
      .filter((income) => income.tenantId === input.tenantId)
      .filter((income) => !input.financialAccountId || !income.financialAccountId || income.financialAccountId === input.financialAccountId)
      .filter((income) => !input.from || income.date >= input.from)
      .filter((income) => !input.to || income.date <= input.to)
      .filter((income) => !input.currency || income.currency === input.currency)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, input.limit);
  }

  async listByPeriod(tenantId: string, financialAccountIdOrFrom: string, fromOrTo?: string, toMaybe?: string) {
    const { financialAccountId, from, to } = normalizeScopedPeriodArgs(financialAccountIdOrFrom, fromOrTo, toMaybe);
    const normalizedFrom = from ?? '';
    const normalizedTo = to ?? '';
    return this.incomes.filter((income) =>
      income.tenantId === tenantId &&
      (!financialAccountId || !income.financialAccountId || income.financialAccountId === financialAccountId) &&
      income.date >= normalizedFrom &&
      income.date <= normalizedTo
    );
  }

  async listRecent(tenantId: string, financialAccountIdOrLimit?: string | number, limitMaybe?: number) {
    const { financialAccountId, limit } = normalizeScopedRecentArgs(financialAccountIdOrLimit, limitMaybe);
    return this.incomes
      .filter((income) => income.tenantId === tenantId)
      .filter((income) => !financialAccountId || !income.financialAccountId || income.financialAccountId === financialAccountId)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, limit);
  }

  async yearlyMonthlyTotalsByTenant(tenantId: string, financialAccountId: string | undefined, year: number) {
    const source = this.incomes.filter((income) =>
      income.tenantId === tenantId &&
      (!financialAccountId || !income.financialAccountId || income.financialAccountId === financialAccountId) &&
      new Date(income.date).getUTCFullYear() === year
    );
    return aggregateCurrencyTotalsBy(source, (income) => {
      const date = new Date(income.date);
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    });
  }

  async monthlyDailyTotalsByTenant(tenantId: string, financialAccountId: string | undefined, month: string) {
    const [year, monthNumber] = month.split('-').map(Number);
    const source = this.incomes.filter((income) => {
      if (income.tenantId !== tenantId) return false;
      if (financialAccountId && income.financialAccountId && income.financialAccountId !== financialAccountId) return false;
      const date = new Date(income.date);
      return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === monthNumber;
    });
    return aggregateCurrencyTotalsBy(source, (income) => {
      const date = new Date(income.date);
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
    });
  }
}

function aggregateCurrencyTotalsBy<T extends { amount: number; currency: string }>(
  items: T[],
  periodKey: (item: T) => string
): CurrencyTotalByPeriod[] {
  const totals = new Map<string, CurrencyTotalByPeriod>();
  for (const item of items) {
    const key = `${periodKey(item)}__${item.currency}`;
    const existing = totals.get(key);
    if (existing) {
      existing.total += Number(item.amount);
      continue;
    }
    totals.set(key, {
      periodKey: periodKey(item),
      currency: item.currency,
      total: Number(item.amount)
    });
  }
  return [...totals.values()].sort((a, b) => a.periodKey.localeCompare(b.periodKey));
}

function normalizeScopedRecentArgs(financialAccountIdOrLimit?: string | number, limitMaybe?: number) {
  if (typeof financialAccountIdOrLimit === 'number') {
    return {
      financialAccountId: undefined,
      limit: financialAccountIdOrLimit
    };
  }

  return {
    financialAccountId: financialAccountIdOrLimit,
    limit: limitMaybe ?? 10
  };
}

function normalizeScopedPeriodArgs(financialAccountIdOrFrom: string | undefined, fromOrTo?: string, toMaybe?: string) {
  if (typeof toMaybe === 'string') {
    return {
      financialAccountId: financialAccountIdOrFrom,
      from: fromOrTo ?? '',
      to: toMaybe
    };
  }

  return {
    financialAccountId: undefined,
    from: financialAccountIdOrFrom,
    to: fromOrTo ?? ''
  };
}

function normalizeScopedUpcomingArgs(
  financialAccountIdOrStartMonth: string | undefined,
  startMonthOrMonths?: string | number,
  monthsMaybe?: number
) {
  if (typeof startMonthOrMonths === 'number') {
    return {
      financialAccountId: undefined,
      startMonth: financialAccountIdOrStartMonth,
      months: startMonthOrMonths
    };
  }

  return {
    financialAccountId: financialAccountIdOrStartMonth,
    startMonth: String(startMonthOrMonths ?? ''),
    months: monthsMaybe ?? 6
  };
}

function buildProjectedExpenses(expense: Expense) {
  const installmentCount = Math.max(1, expense.installmentCount ?? 1);
  const firstInstallmentDate = expense.firstInstallmentDate ?? expense.date;
  const purchaseDate = expense.purchaseDate ?? expense.date;
  const centsTotal = Math.round(Number(expense.amount) * 100);
  const base = Math.floor(centsTotal / installmentCount);
  let remainder = centsTotal - (base * installmentCount);
  const firstDate = new Date(firstInstallmentDate);

  return Array.from({ length: installmentCount }, (_, index) => {
    const cents = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
    const dueDate = addMonthsClamped(firstDate, index).toISOString();
    return {
      ...expense,
      date: dueDate,
      amount: cents / 100,
      totalAmount: Number(expense.amount),
      purchaseDate,
      installmentCount,
      installmentNumber: index + 1,
      firstInstallmentDate
    };
  });
}

function addMonthsClamped(date: Date, months: number) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const day = date.getUTCDate();
  const targetYear = year + Math.floor(month / 12);
  const targetMonth = ((month % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(
    targetYear,
    targetMonth,
    Math.min(day, lastDay),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds()
  ));
}

function sortProjectedExpenses(a: Expense, b: Expense) {
  return b.date.localeCompare(a.date) || (a.installmentNumber ?? 1) - (b.installmentNumber ?? 1);
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export class InMemoryBudgetRepository implements BudgetRepository {
  private readonly budgets: MonthlyBudget[] = [];

  async upsertMonthly(input: Omit<MonthlyBudget, 'id'>) {
    const index = this.budgets.findIndex(
      (budget) =>
        budget.tenantId === input.tenantId &&
        budget.categoryId === input.categoryId &&
        budget.subcategoryId === input.subcategoryId
    );
    const budget = { ...input, id: index >= 0 ? this.budgets[index].id : randomUUID() };
    if (index >= 0) this.budgets[index] = budget;
    else this.budgets.push(budget);
    return budget;
  }

  async listMonthly(tenantId: string, financialAccountId?: string) {
    return this.budgets.filter((budget) =>
      budget.tenantId === tenantId &&
      (!financialAccountId || !budget.financialAccountId || budget.financialAccountId === financialAccountId)
    );
  }
}

export class InMemoryMessagingMessageAuditRepository implements MessagingMessageAuditRepository {
  readonly messages: Array<Parameters<MessagingMessageAuditRepository['create']>[0] & { createdAt?: string }> = [];

  async reserve(input: Parameters<MessagingMessageAuditRepository['reserve']>[0]) {
    const channel = input.channel ?? 'whatsapp';
    if (this.messages.some((message) =>
      message.providerMessageId === input.providerMessageId &&
      (message.channel ?? 'whatsapp') === channel
    )) {
      return false;
    }

    this.messages.push({ ...input, channel, parsingStatus: 'processing', createdAt: new Date().toISOString() });
    return true;
  }

  async updateByProviderMessageId(
    providerMessageId: string,
    input: Parameters<MessagingMessageAuditRepository['updateByProviderMessageId']>[1]
  ) {
    const channel = input.channel ?? 'whatsapp';
    const index = this.messages.findIndex((message) =>
      message.providerMessageId === providerMessageId &&
      (message.channel ?? 'whatsapp') === channel
    );
    if (index < 0) return;
    this.messages[index] = { ...this.messages[index], ...input };
  }

  async create(input: Parameters<MessagingMessageAuditRepository['create']>[0]) {
    this.messages.push({ ...input, createdAt: new Date().toISOString() });
  }

  async existsRecentDuplicate(input: {
    channel?: 'whatsapp' | 'telegram';
    fromPhoneNumber: string;
    message: string;
    since: Date;
    excludeProviderMessageId?: string;
  }) {
    const channel = input.channel ?? 'whatsapp';
    const sinceIso = input.since.toISOString();
    return this.messages.some((message) =>
      (message.channel ?? 'whatsapp') === channel &&
      message.fromPhoneNumber === input.fromPhoneNumber &&
      message.message.trim().toLowerCase() === input.message.trim().toLowerCase() &&
      message.parsingStatus === 'saved' &&
      (!input.excludeProviderMessageId || message.providerMessageId !== input.excludeProviderMessageId) &&
      typeof message.createdAt === 'string' &&
      message.createdAt >= sinceIso
    );
  }
}

export class InMemoryMessagingPendingDraftRepository implements MessagingPendingDraftRepository {
  readonly drafts: ConversationPendingDraft[] = [];

  async findActive(tenantId: string, userId: string, now: Date, channel = 'whatsapp') {
    return this.drafts.find((draft) =>
      draft.tenantId === tenantId &&
      draft.userId === userId &&
      (draft.channel ?? 'whatsapp') === channel &&
      draft.expiresAt >= now.toISOString()
    );
  }

  async upsert(input: Omit<ConversationPendingDraft, 'id'>) {
    const channel = input.channel ?? 'whatsapp';
    const index = this.drafts.findIndex((draft) =>
      draft.tenantId === input.tenantId &&
      draft.userId === input.userId &&
      (draft.channel ?? 'whatsapp') === channel
    );
    const draft = { ...input, id: index >= 0 ? this.drafts[index].id : randomUUID() };
    if (index >= 0) this.drafts[index] = draft;
    else this.drafts.push(draft);
    return draft;
  }

  async clear(tenantId: string, userId: string, channel = 'whatsapp') {
    const index = this.drafts.findIndex((draft) =>
      draft.tenantId === tenantId &&
      draft.userId === userId &&
      (draft.channel ?? 'whatsapp') === channel
    );
    if (index >= 0) this.drafts.splice(index, 1);
  }
}

export class InMemoryReportDispatchRepository implements ReportDispatchRepository {
  private readonly dispatches: Array<{
    tenantId: string;
    userId: string;
    channel: 'whatsapp' | 'telegram';
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    periodFrom: string;
    periodTo: string;
    status: 'pending' | 'sent' | 'failed';
    errorMessage?: string;
  }> = [];

  async reserve(input: {
    tenantId: string;
    userId: string;
    channel?: 'whatsapp' | 'telegram';
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    periodFrom: string;
    periodTo: string;
  }) {
    const channel = input.channel ?? 'whatsapp';
    const exists = this.dispatches.some((item) =>
      item.channel === channel &&
      item.frequency === input.frequency &&
      item.periodFrom === input.periodFrom &&
      item.periodTo === input.periodTo &&
      item.userId === input.userId &&
      (item.status === 'pending' || item.status === 'sent')
    );
    if (exists) return false;

    this.dispatches.push({
      tenantId: input.tenantId,
      userId: input.userId,
      channel,
      frequency: input.frequency,
      periodFrom: input.periodFrom,
      periodTo: input.periodTo,
      status: 'pending'
    });
    return true;
  }

  async markSent(input: {
    userId: string;
    channel?: 'whatsapp' | 'telegram';
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    periodFrom: string;
    periodTo: string;
  }) {
    const channel = input.channel ?? 'whatsapp';
    const dispatch = this.dispatches.find((item) =>
      item.channel === channel &&
      item.frequency === input.frequency &&
      item.periodFrom === input.periodFrom &&
      item.periodTo === input.periodTo &&
      item.userId === input.userId &&
      item.status === 'pending'
    );
    if (!dispatch) return;
    dispatch.status = 'sent';
    dispatch.errorMessage = undefined;
  }

  async markFailed(input: {
    userId: string;
    channel?: 'whatsapp' | 'telegram';
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    periodFrom: string;
    periodTo: string;
    errorMessage: string;
  }) {
    const channel = input.channel ?? 'whatsapp';
    const dispatch = this.dispatches.find((item) =>
      item.channel === channel &&
      item.frequency === input.frequency &&
      item.periodFrom === input.periodFrom &&
      item.periodTo === input.periodTo &&
      item.userId === input.userId &&
      item.status === 'pending'
    );
    if (!dispatch) return;
    dispatch.status = 'failed';
    dispatch.errorMessage = input.errorMessage;
  }
}

export class InMemoryTelegramLinkTokenRepository implements TelegramLinkTokenRepository {
  private readonly tokens = new Map<string, { chatId: string; phoneNumber?: string; expiresAt: string; consumed: boolean }>();

  async create(input: { token: string; chatId: string; phoneNumber?: string; expiresAt: Date }) {
    this.tokens.set(input.token, {
      chatId: input.chatId,
      phoneNumber: input.phoneNumber,
      expiresAt: input.expiresAt.toISOString(),
      consumed: false
    });
  }

  async consume(token: string, now: Date) {
    const record = this.tokens.get(token);
    if (!record) return undefined;
    if (record.consumed) return undefined;
    if (record.expiresAt < now.toISOString()) return undefined;
    record.consumed = true;
    return {
      token,
      chatId: record.chatId,
      phoneNumber: record.phoneNumber,
      expiresAt: record.expiresAt
    };
  }
}

export class InMemoryEmailMagicLinkTokenRepository implements EmailMagicLinkTokenRepository {
  private readonly tokens = new Map<string, { userId: string; expiresAt: string; consumed: boolean }>();

  async create(input: { token: string; userId: string; expiresAt: Date }) {
    this.tokens.set(input.token, {
      userId: input.userId,
      expiresAt: input.expiresAt.toISOString(),
      consumed: false
    });
  }

  async consume(token: string, now: Date) {
    const record = this.tokens.get(token);
    if (!record) return undefined;
    if (record.consumed) return undefined;
    if (record.expiresAt < now.toISOString()) return undefined;
    record.consumed = true;
    return {
      token,
      userId: record.userId,
      expiresAt: record.expiresAt
    };
  }
}
