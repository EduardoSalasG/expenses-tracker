import type { PoolClient, QueryResultRow } from 'pg';
import type { BankOptionRepository, BudgetRepository, CategoryRepository, EmailMagicLinkTokenRepository, ExpenseRepository, FinancialAccountMembershipRecord, FinancialAccountRepository, IncomeRepository, MessagingMessageAuditRepository, MessagingPendingDraftRepository, OtpRepository, PaymentMethodOptionRepository, RegistrationLeadRepository, ReportDispatchRepository, TelegramLinkTokenRepository, UserRepository } from '../../application/ports.js';
import type { BankOption, Category, ConversationPendingDraft, Expense, ExpenseAllocation, FinancialAccount, FinancialAccountInvitation, FinancialAccountMember, FinancialAccountMemberBalance, FinancialAccountMemberProfile, FinancialAccountSettlementSuggestion, FinancialAccountSettlement, Income, MessagingChannelContext, MonthlyBudget, PaymentMethodOption, RegistrationLead, ReportFrequency, User } from '../../domain/index.js';
import type { DatabasePool } from '../database.js';

const PERMANENT_BUDGET_MONTH = '2000-01-01';

export class PostgresUserRepository implements UserRepository {
  constructor(private readonly pool: DatabasePool) {}

  async findByPhoneNumber(phoneNumber: string) {
    const result = await this.pool.query('select * from users where phone_number = $1', [phoneNumber]);
    return result.rows[0] ? mapUser(result.rows[0]) : undefined;
  }

  async findAuthByPhoneNumber(phoneNumber: string) {
    const result = await this.pool.query('select * from users where phone_number = $1', [phoneNumber]);
    if (!result.rows[0]) return undefined;
    return {
      user: mapUser(result.rows[0]),
      passwordHash: result.rows[0].password_hash ?? undefined
    };
  }

  async findByTelegramChatId(chatId: string) {
    const result = await this.pool.query('select * from users where telegram_chat_id = $1', [chatId]);
    return result.rows[0] ? mapUser(result.rows[0]) : undefined;
  }

  async findById(userId: string) {
    const result = await this.pool.query('select * from users where id = $1', [userId]);
    return result.rows[0] ? mapUser(result.rows[0]) : undefined;
  }

  async listByReportFrequency(frequency: ReportFrequency) {
    const result = await this.pool.query(
      `select * from users where $1 = any(report_preferences) order by created_at`,
      [frequency]
    );
    return result.rows.map(mapUser);
  }

  async upsertByPhoneNumber(input: Omit<User, 'id' | 'tenantId' | 'role' | 'reportPreferences'>) {
    const result = await this.pool.query(
      `select * from upsert_user_by_phone($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        input.phoneNumber,
        input.firstName,
        input.lastName,
        input.preferredName,
        input.email ?? null,
        input.countryOfResidence,
        input.preferredCurrency,
        input.preferredLanguage ?? 'es'
      ]
    );
    return mapUser(result.rows[0]);
  }

  async setPasswordHash(userId: string, passwordHash: string) {
    const result = await this.pool.query(
      `update users
       set password_hash = $2,
           updated_at = now()
       where id = $1
       returning *`,
      [userId, passwordHash]
    );
    if (!result.rows[0]) throw new Error('User not found.');
    return mapUser(result.rows[0]);
  }

  async linkTelegramChatByPhone(phoneNumber: string, chatId: string, username?: string) {
    const result = await this.pool.query(
      `update users
       set telegram_chat_id = $2,
           telegram_username = coalesce($3, telegram_username),
           updated_at = now()
       where phone_number = $1
       returning *`,
      [phoneNumber, chatId, username ?? null]
    );
    return result.rows[0] ? mapUser(result.rows[0]) : undefined;
  }

  async updateProfile(userId: string, input: Pick<User, 'firstName' | 'lastName' | 'preferredName' | 'email' | 'countryOfResidence' | 'preferredCurrency' | 'preferredLanguage'>) {
    const result = await this.pool.query(
      `update users
       set first_name = $2,
           last_name = $3,
           preferred_name = $4,
           email = $5,
           country_of_residence = $6,
           preferred_currency = $7,
           preferred_language = $8,
           updated_at = now()
       where id = $1
       returning *`,
      [
        userId,
        input.firstName,
        input.lastName,
        input.preferredName,
        input.email ?? null,
        input.countryOfResidence,
        input.preferredCurrency,
        input.preferredLanguage ?? 'es'
      ]
    );
    if (!result.rows[0]) throw new Error('User not found.');
    return mapUser(result.rows[0]);
  }

  async updateReportPreferences(userId: string, preferences: ReportFrequency[]) {
    const result = await this.pool.query(
      `update users set report_preferences = $2, updated_at = now() where id = $1 returning *`,
      [userId, preferences]
    );
    if (!result.rows[0]) throw new Error('User not found.');
    return mapUser(result.rows[0]);
  }
}

export class PostgresRegistrationLeadRepository implements RegistrationLeadRepository {
  constructor(private readonly pool: DatabasePool) {}

  async upsertStarted(input: {
    firstName: string;
    email: string;
    preferredLanguage?: 'es' | 'en';
    phoneNumber?: string;
  }) {
    const result = await this.pool.query(
      `insert into registration_leads (
        email, first_name, preferred_language, phone_number, status
      )
      values ($1, $2, $3, $4, 'started')
      on conflict (email) do update
      set first_name = excluded.first_name,
          preferred_language = excluded.preferred_language,
          phone_number = coalesce(excluded.phone_number, registration_leads.phone_number),
          status = case when registration_leads.status = 'completed' then 'completed' else 'started' end,
          updated_at = now()
      returning *`,
      [
        input.email.trim().toLowerCase(),
        input.firstName,
        input.preferredLanguage ?? 'es',
        input.phoneNumber ?? null
      ]
    );

    return mapRegistrationLead(result.rows[0]);
  }

  async markCompletedByEmail(email: string, phoneNumber?: string) {
    await this.pool.query(
      `update registration_leads
       set phone_number = coalesce($2, phone_number),
           status = 'completed',
           completed_at = coalesce(completed_at, now()),
           updated_at = now()
       where email = $1`,
      [email.trim().toLowerCase(), phoneNumber ?? null]
    );
  }
}

export class PostgresFinancialAccountRepository implements FinancialAccountRepository {
  constructor(private readonly pool: DatabasePool) {}

  async ensurePersonalAccount(userId: string) {
    const result = await this.pool.query(
      `select fa.*
       from financial_accounts fa
       where fa.id = ensure_personal_financial_account($1)`,
      [userId]
    );
    const account = mapFinancialAccount(result.rows[0]);
    await this.pool.query(
      `insert into financial_account_members (financial_account_id, user_id, role, status, joined_at)
       values ($1, $2, 'owner', 'active', now())
       on conflict (financial_account_id, user_id)
       do update set role = excluded.role, status = excluded.status, joined_at = coalesce(financial_account_members.joined_at, excluded.joined_at), updated_at = now()`,
      [account.id, userId]
    );
    return account;
  }

  async findAccessibleById(userId: string, financialAccountId: string) {
    const result = await this.pool.query(
      `select
         fa.*,
         fam.role as membership_role
       from financial_accounts fa
       join financial_account_members fam
         on fam.financial_account_id = fa.id
        and fam.user_id = $1
        and fam.status = 'active'
       where fa.id = $2
       limit 1`,
      [userId, financialAccountId]
    );
    return result.rows[0] ? mapFinancialAccountMembership(result.rows[0]) : undefined;
  }

  async listAccessibleByUser(userId: string) {
    const result = await this.pool.query(
      `select
         fa.*,
         fam.role as membership_role
       from financial_accounts fa
       join financial_account_members fam
         on fam.financial_account_id = fa.id
        and fam.user_id = $1
        and fam.status = 'active'
       order by fa.type asc, fa.created_at asc`,
      [userId]
    );
    return result.rows.map(mapFinancialAccountMembership);
  }

  async findById(financialAccountId: string) {
    const result = await this.pool.query(
      `select * from financial_accounts where id = $1 limit 1`,
      [financialAccountId]
    );
    return result.rows[0] ? mapFinancialAccount(result.rows[0]) : undefined;
  }

  async createSharedAccount(input: {
    tenantId: string;
    createdByUserId: string;
    name: string;
    currency: string;
  }) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const inserted = await client.query(
        `insert into financial_accounts (tenant_id, type, name, currency, created_by_user_id)
         values ($1, 'shared', $2, $3, $4)
         returning *`,
        [input.tenantId, input.name, input.currency, input.createdByUserId]
      );
      const account = mapFinancialAccount(inserted.rows[0]);
      await client.query(
        `insert into financial_account_members (financial_account_id, user_id, role, status, joined_at)
         values ($1, $2, 'owner', 'active', now())`,
        [account.id, input.createdByUserId]
      );
      await client.query('commit');
      return {
        account,
        role: 'owner'
      } satisfies FinancialAccountMembershipRecord;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateSharedAccountName(input: { financialAccountId: string; name: string }) {
    const result = await this.pool.query(
      `update financial_accounts
       set name = $2,
           updated_at = now()
       where id = $1
         and type = 'shared'
       returning *`,
      [input.financialAccountId, input.name]
    );
    return result.rows[0] ? mapFinancialAccount(result.rows[0]) : undefined;
  }

  async listMembers(financialAccountId: string) {
    const result = await this.pool.query(
      `select
         fam.id as member_id,
         fam.financial_account_id,
         fam.user_id,
         fam.role,
         fam.status,
         fam.joined_at,
         fam.created_at,
         fam.updated_at,
         u.first_name,
         u.last_name,
         u.preferred_name,
         u.email,
         u.phone_number
       from financial_account_members fam
       join users u on u.id = fam.user_id
       where fam.financial_account_id = $1
       order by fam.created_at asc`,
      [financialAccountId]
    );
    return result.rows.map(mapFinancialAccountMemberProfile);
  }

  async findMember(financialAccountId: string, userId: string) {
    const result = await this.pool.query(
      `select * from financial_account_members
       where financial_account_id = $1 and user_id = $2
       limit 1`,
      [financialAccountId, userId]
    );
    return result.rows[0] ? mapFinancialAccountMember(result.rows[0]) : undefined;
  }

  async upsertMember(input: {
    financialAccountId: string;
    userId: string;
    role: 'owner' | 'admin' | 'member';
    status: 'active' | 'invited' | 'removed';
    joinedAt?: string;
  }) {
    const result = await this.pool.query(
      `insert into financial_account_members (
         financial_account_id, user_id, role, status, joined_at
       )
       values ($1, $2, $3, $4, $5)
       on conflict (financial_account_id, user_id)
       do update set
         role = excluded.role,
         status = excluded.status,
         joined_at = coalesce(financial_account_members.joined_at, excluded.joined_at),
         updated_at = now()
       returning *`,
      [input.financialAccountId, input.userId, input.role, input.status, input.joinedAt ?? null]
    );
    return mapFinancialAccountMember(result.rows[0]);
  }

  async removeMember(financialAccountId: string, userId: string) {
    const result = await this.pool.query(
      `update financial_account_members
       set status = 'removed',
           updated_at = now()
       where financial_account_id = $1
         and user_id = $2
         and status <> 'removed'`,
      [financialAccountId, userId]
    );
    return result.rowCount === 1;
  }

  async countActiveOwners(financialAccountId: string) {
    const result = await this.pool.query(
      `select count(*)::int as total
       from financial_account_members
       where financial_account_id = $1
         and status = 'active'
         and role = 'owner'`,
      [financialAccountId]
    );
    return Number(result.rows[0]?.total ?? 0);
  }

  async listBalances(financialAccountId: string) {
    const result = await this.pool.query(
      `with active_members as (
         select
           fam.financial_account_id,
           fam.user_id,
           u.first_name,
           u.last_name,
           u.preferred_name
         from financial_account_members fam
         join users u on u.id = fam.user_id
         where fam.financial_account_id = $1
           and fam.status = 'active'
       ),
       flow_entries as (
         select
           ea.owed_by_user_id as user_id,
           e.currency,
           -ea.amount::numeric as delta
         from expense_allocations ea
         join expenses e on e.id = ea.expense_id
         where ea.financial_account_id = $1
           and e.paid_by_user_id is not null
           and ea.owed_by_user_id <> e.paid_by_user_id
         union all
         select
           e.paid_by_user_id as user_id,
           e.currency,
           ea.amount::numeric as delta
         from expense_allocations ea
         join expenses e on e.id = ea.expense_id
         where ea.financial_account_id = $1
           and e.paid_by_user_id is not null
           and ea.owed_by_user_id <> e.paid_by_user_id
         union all
         select
           fas.paid_by_user_id as user_id,
           fas.currency,
           fas.amount::numeric as delta
         from financial_account_settlements fas
         where fas.financial_account_id = $1
         union all
         select
           fas.received_by_user_id as user_id,
           fas.currency,
           -fas.amount::numeric as delta
         from financial_account_settlements fas
         where fas.financial_account_id = $1
       ),
       currencies as (
         select distinct currency from flow_entries
         union
         select currency from financial_accounts where id = $1
       )
       select
         am.financial_account_id,
         am.user_id,
         am.first_name,
         am.last_name,
         am.preferred_name,
         c.currency,
         coalesce(sum(fe.delta), 0)::numeric as net_amount
       from active_members am
       cross join currencies c
       left join flow_entries fe
         on fe.user_id = am.user_id
        and fe.currency = c.currency
       group by
         am.financial_account_id,
         am.user_id,
         am.first_name,
         am.last_name,
         am.preferred_name,
         c.currency
       order by am.preferred_name asc, c.currency asc`,
      [financialAccountId]
    );
    return result.rows.map(mapFinancialAccountMemberBalance);
  }

  async listSettlementSuggestions(financialAccountId: string) {
    return buildSettlementSuggestions(await this.listBalances(financialAccountId));
  }

  async listSettlements(financialAccountId: string) {
    const result = await this.pool.query(
      `select
         fas.*,
         payer.preferred_name as paid_by_preferred_name,
         receiver.preferred_name as received_by_preferred_name,
         recorder.preferred_name as recorded_by_preferred_name
       from financial_account_settlements fas
       join users payer on payer.id = fas.paid_by_user_id
       join users receiver on receiver.id = fas.received_by_user_id
       join users recorder on recorder.id = fas.recorded_by_user_id
       where fas.financial_account_id = $1
       order by fas.settled_at desc, fas.created_at desc`,
      [financialAccountId]
    );
    return result.rows.map(mapFinancialAccountSettlement);
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
    const result = await this.pool.query(
      `insert into financial_account_settlements (
         financial_account_id,
         recorded_by_user_id,
         paid_by_user_id,
         received_by_user_id,
         currency,
         amount,
         settled_at,
         note
       )
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning *`,
      [
        input.financialAccountId,
        input.recordedByUserId,
        input.paidByUserId,
        input.receivedByUserId,
        input.currency,
        input.amount,
        input.settledAt,
        input.note ?? null
      ]
    );

    const joined = await this.pool.query(
      `select
         fas.*,
         payer.preferred_name as paid_by_preferred_name,
         receiver.preferred_name as received_by_preferred_name,
         recorder.preferred_name as recorded_by_preferred_name
       from financial_account_settlements fas
       join users payer on payer.id = fas.paid_by_user_id
       join users receiver on receiver.id = fas.received_by_user_id
       join users recorder on recorder.id = fas.recorded_by_user_id
       where fas.id = $1`,
      [result.rows[0].id]
    );
    return mapFinancialAccountSettlement(joined.rows[0]);
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
    const result = await this.pool.query(
      `insert into financial_account_invitations (
         financial_account_id, invited_by_user_id, email, phone_number, role, token, status, expires_at
       )
       values ($1, $2, $3, $4, $5, $6, 'pending', $7)
       returning *`,
      [
        input.financialAccountId,
        input.invitedByUserId ?? null,
        input.email.trim().toLowerCase(),
        input.phoneNumber ?? null,
        input.role,
        input.token,
        input.expiresAt
      ]
    );
    return mapFinancialAccountInvitation(result.rows[0]);
  }

  async findPendingInvitationByToken(token: string, now: string) {
    const result = await this.pool.query(
      `select *
       from financial_account_invitations
       where token = $1
         and status = 'pending'
         and expires_at >= $2
       limit 1`,
      [token, now]
    );
    return result.rows[0] ? mapFinancialAccountInvitation(result.rows[0]) : undefined;
  }

  async markInvitationAccepted(token: string, acceptedAt: string) {
    await this.pool.query(
      `update financial_account_invitations
       set status = 'accepted',
           accepted_at = $2,
           updated_at = now()
       where token = $1`,
      [token, acceptedAt]
    );
  }

  async findMessagingContext(channel: 'whatsapp' | 'telegram', providerUserId: string) {
    const result = await this.pool.query(
      `select * from messaging_channel_contexts
       where channel = $1 and provider_user_id = $2
       limit 1`,
      [channel, providerUserId]
    );
    return result.rows[0] ? mapMessagingChannelContext(result.rows[0]) : undefined;
  }

  async upsertMessagingContext(input: {
    channel: 'whatsapp' | 'telegram';
    providerUserId: string;
    userId: string;
    financialAccountId: string;
  }) {
    const result = await this.pool.query(
      `insert into messaging_channel_contexts (
         channel, provider_user_id, user_id, financial_account_id
       )
       values ($1, $2, $3, $4)
       on conflict (channel, provider_user_id)
       do update set
         user_id = excluded.user_id,
         financial_account_id = excluded.financial_account_id,
         updated_at = now()
       returning *`,
      [input.channel, input.providerUserId, input.userId, input.financialAccountId]
    );
    return mapMessagingChannelContext(result.rows[0]);
  }
}

export class PostgresOtpRepository implements OtpRepository {
  constructor(private readonly pool: DatabasePool) {}

  async create(phoneNumber: string, code: string, expiresAt: Date) {
    await this.pool.query(
      `insert into otp_codes (phone_number, code, expires_at)
       values ($1, $2, $3)
       on conflict (phone_number) do update set code = excluded.code, expires_at = excluded.expires_at, consumed_at = null, created_at = now()`,
      [phoneNumber, code, expiresAt]
    );
  }

  async verify(phoneNumber: string, code: string, now: Date) {
    const result = await this.pool.query(
      `update otp_codes
       set consumed_at = $3
       where phone_number = $1 and code = $2 and expires_at >= $3 and consumed_at is null
       returning phone_number`,
      [phoneNumber, code, now]
    );
    return result.rowCount === 1;
  }
}

export class PostgresCategoryRepository implements CategoryRepository {
  constructor(private readonly pool: DatabasePool) {}

  async listByTenant(tenantId: string, financialAccountId?: string) {
    const result = await this.pool.query(
      `select *
       from categories
       where
         (
           (tenant_id in ('11111111-1111-1111-1111-111111111111'::uuid) and financial_account_id is null)
           or (tenant_id = $1 and financial_account_id is null)
           or (tenant_id = $1 and financial_account_id = $2)
         )
       order by parent_id nulls first, name`,
      [tenantId, financialAccountId ?? null]
    );
    return result.rows.map(mapCategory);
  }

  async create(input: Omit<Category, 'id'>) {
    const result = await this.pool.query(
      `insert into categories (tenant_id, financial_account_id, name, parent_id, is_default)
       values ($1, $2, $3, $4, $5)
       returning *`,
      [input.tenantId, input.financialAccountId ?? null, input.name, input.parentId ?? null, input.isDefault]
    );
    return mapCategory(result.rows[0]);
  }

  async ensureDefaults(tenantId: string) {
    await this.pool.query('select seed_default_categories($1)', [tenantId]);
  }
}

export class PostgresBankOptionRepository implements BankOptionRepository {
  constructor(private readonly pool: DatabasePool) {}

  async listByTenant(tenantId: string, financialAccountId?: string) {
    const result = await this.pool.query(
      `select * from bank_options
       where
         (
           (tenant_id in ('11111111-1111-1111-1111-111111111111'::uuid) and financial_account_id is null)
           or (tenant_id = $1 and financial_account_id is null)
           or (tenant_id = $1 and financial_account_id = $2)
         )
       order by is_default desc, name`,
      [tenantId, financialAccountId ?? null]
    );
    return result.rows.map(mapBankOption);
  }

  async findAccessibleById(tenantId: string, bankOptionId: string, financialAccountId?: string) {
    const result = await this.pool.query(
      `select * from bank_options
       where id = $1
         and (
           (tenant_id in ('11111111-1111-1111-1111-111111111111'::uuid) and financial_account_id is null)
           or (tenant_id = $2 and financial_account_id is null)
           or (tenant_id = $2 and financial_account_id = $3)
         )`,
      [bankOptionId, tenantId, financialAccountId ?? null]
    );
    return result.rows[0] ? mapBankOption(result.rows[0]) : undefined;
  }

  async create(input: Omit<BankOption, 'id'>) {
    const result = await this.pool.query(
      `insert into bank_options (tenant_id, financial_account_id, name, is_default)
       values ($1, $2, $3, $4)
       returning *`,
      [input.tenantId ?? null, input.financialAccountId ?? null, input.name, input.isDefault]
    );
    return mapBankOption(result.rows[0]);
  }

  async update(input: { tenantId: string; financialAccountId?: string; bankOptionId: string; name: string }) {
    const result = await this.pool.query(
      `update bank_options
       set name = $3,
           updated_at = now()
       where id = $1 and tenant_id = $2 and ($4::uuid is null or financial_account_id = $4) and is_default = false
       returning *`,
      [input.bankOptionId, input.tenantId, input.name, input.financialAccountId ?? null]
    );
    return result.rows[0] ? mapBankOption(result.rows[0]) : undefined;
  }

  async delete(input: { tenantId: string; financialAccountId?: string; bankOptionId: string }) {
    try {
      const result = await this.pool.query(
        `delete from bank_options
         where id = $1 and tenant_id = $2 and ($3::uuid is null or financial_account_id = $3) and is_default = false`,
        [input.bankOptionId, input.tenantId, input.financialAccountId ?? null]
      );
      return result.rowCount === 1;
    } catch (error) {
      if (isForeignKeyViolation(error)) throw new Error('Bank option is in use by existing expenses.');
      throw error;
    }
  }
}

export class PostgresPaymentMethodOptionRepository implements PaymentMethodOptionRepository {
  constructor(private readonly pool: DatabasePool) {}

  async listByTenant(tenantId: string, financialAccountId?: string) {
    const result = await this.pool.query(
      `select * from payment_method_options
       where
         (
           (tenant_id in ('11111111-1111-1111-1111-111111111111'::uuid) and financial_account_id is null)
           or (tenant_id = $1 and financial_account_id is null)
           or (tenant_id = $1 and financial_account_id = $2)
         )
       order by is_default desc, name`,
      [tenantId, financialAccountId ?? null]
    );
    return result.rows.map(mapPaymentMethodOption);
  }

  async findAccessibleById(tenantId: string, paymentMethodOptionId: string, financialAccountId?: string) {
    const result = await this.pool.query(
      `select * from payment_method_options
       where id = $1
         and (
           (tenant_id in ('11111111-1111-1111-1111-111111111111'::uuid) and financial_account_id is null)
           or (tenant_id = $2 and financial_account_id is null)
           or (tenant_id = $2 and financial_account_id = $3)
         )`,
      [paymentMethodOptionId, tenantId, financialAccountId ?? null]
    );
    return result.rows[0] ? mapPaymentMethodOption(result.rows[0]) : undefined;
  }

  async create(input: Omit<PaymentMethodOption, 'id'>) {
    const result = await this.pool.query(
      `insert into payment_method_options (tenant_id, financial_account_id, code, name, kind, card_type, is_default)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning *`,
      [input.tenantId ?? null, input.financialAccountId ?? null, input.code, input.name, input.kind, input.cardType ?? null, input.isDefault]
    );
    return mapPaymentMethodOption(result.rows[0]);
  }

  async update(input: {
    tenantId: string;
    financialAccountId?: string;
    paymentMethodOptionId: string;
    code: string;
    name: string;
    kind: PaymentMethodOption['kind'];
    cardType?: PaymentMethodOption['cardType'];
  }) {
    const result = await this.pool.query(
      `update payment_method_options
       set code = $3,
           name = $4,
           kind = $5,
           card_type = $6,
           updated_at = now()
       where id = $1 and tenant_id = $2 and ($7::uuid is null or financial_account_id = $7) and is_default = false
       returning *`,
      [input.paymentMethodOptionId, input.tenantId, input.code, input.name, input.kind, input.cardType ?? null, input.financialAccountId ?? null]
    );
    return result.rows[0] ? mapPaymentMethodOption(result.rows[0]) : undefined;
  }

  async delete(input: { tenantId: string; financialAccountId?: string; paymentMethodOptionId: string }) {
    try {
      const result = await this.pool.query(
        `delete from payment_method_options
         where id = $1 and tenant_id = $2 and ($3::uuid is null or financial_account_id = $3) and is_default = false`,
        [input.paymentMethodOptionId, input.tenantId, input.financialAccountId ?? null]
      );
      return result.rowCount === 1;
    } catch (error) {
      if (isForeignKeyViolation(error)) throw new Error('Payment method option is in use by existing expenses.');
      throw error;
    }
  }
}

export class PostgresExpenseRepository implements ExpenseRepository {
  constructor(private readonly pool: DatabasePool) {}

  async create(input: Omit<Expense, 'id'>) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const purchaseDate = input.purchaseDate ?? input.date;
      const installmentCount = Math.max(1, input.installmentCount ?? 1);
      const firstInstallmentDate = input.firstInstallmentDate ?? purchaseDate;

      const inserted = await client.query(
        `insert into expenses (
          tenant_id, financial_account_id, user_id, created_by_user_id, paid_by_user_id, allocation_mode, expense_date, purchase_date, amount, currency, concept, category_id, subcategory_id,
          payment_method_option_id, bank_option_id, payment_method_kind, bank, card_type, original_message,
          installment_count, first_installment_date
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        returning id`,
        [
          input.tenantId,
          input.financialAccountId ?? null,
          input.userId,
          input.createdByUserId ?? input.userId,
          input.paidByUserId ?? input.userId,
          input.allocationMode ?? null,
          purchaseDate,
          purchaseDate,
          input.amount,
          input.currency,
          input.concept,
          input.categoryId,
          input.subcategoryId ?? null,
          input.paymentMethodOptionId ?? null,
          input.bankOptionId ?? null,
          input.paymentMethod.kind,
          input.paymentMethod.bank ?? null,
          input.paymentMethod.cardType ?? null,
          input.originalMessage ?? null,
          installmentCount,
          firstInstallmentDate
        ]
      );

      const expenseId = inserted.rows[0].id as string;
      await replaceExpenseInstallments(client, expenseId, input.amount, installmentCount, firstInstallmentDate);
      if (input.financialAccountId && input.allocations) {
        await replaceExpenseAllocations(client, expenseId, input.financialAccountId, input.allocations);
      }
      const projected = await client.query(expenseProjectionSelectSql({ whereClause: 'where e.tenant_id = $1 and e.id = $2', limitClause: 'limit 1' }), [input.tenantId, expenseId]);
      await client.query('commit');
      const expenses = await attachExpenseAllocations(client, projected.rows.map(mapExpense));
      return expenses[0];
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async delete(input: { tenantId: string; financialAccountId?: string; expenseId: string }) {
    const result = await this.pool.query(
      `delete from expenses
       where tenant_id = $1 and id = $2 and ($3::uuid is null or financial_account_id = $3)`,
      [input.tenantId, input.expenseId, input.financialAccountId ?? null]
    );
    return result.rowCount === 1;
  }

  async findById(input: { tenantId: string; financialAccountId?: string; expenseId: string }) {
    const result = await this.pool.query(
      expenseProjectionSelectSql({ whereClause: 'where e.tenant_id = $1 and e.id = $2 and ($3::uuid is null or e.financial_account_id = $3)', limitClause: 'limit 1' }),
      [input.tenantId, input.expenseId, input.financialAccountId ?? null]
    );
    const expenses = await attachExpenseAllocations(this.pool, result.rows.map(mapExpense));
    return expenses[0];
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
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const existing = await client.query(
        `select * from expenses where tenant_id = $1 and id = $2 and ($3::uuid is null or financial_account_id = $3)`,
        [input.tenantId, input.expenseId, input.financialAccountId ?? null]
      );
      if (!existing.rows[0]) {
        await client.query('rollback');
        return undefined;
      }

      const row = existing.rows[0];
      const purchaseDate = input.date ?? toIsoString(row.purchase_date ?? row.expense_date);
      const totalAmount = input.amount ?? Number(row.amount);
      const installmentCount = input.installmentCount ?? Number(row.installment_count ?? 1);
      const firstInstallmentDate = Object.prototype.hasOwnProperty.call(input, 'firstInstallmentDate')
        ? input.firstInstallmentDate ?? purchaseDate
        : toIsoString(row.first_installment_date ?? row.purchase_date ?? row.expense_date);
      const paymentMethodKind = input.paymentMethod?.kind ?? row.payment_method_kind;
      const paymentBank = Object.prototype.hasOwnProperty.call(input, 'paymentMethod')
        ? input.paymentMethod?.bank ?? null
        : row.bank ?? null;
      const paymentCardType = Object.prototype.hasOwnProperty.call(input, 'paymentMethod')
        ? input.paymentMethod?.cardType ?? null
        : row.card_type ?? null;
      const paidByUserId = Object.prototype.hasOwnProperty.call(input, 'paidByUserId')
        ? input.paidByUserId ?? null
        : row.paid_by_user_id ?? null;
      const allocationMode = Object.prototype.hasOwnProperty.call(input, 'allocationMode')
        ? input.allocationMode ?? null
        : row.allocation_mode ?? null;

      await client.query(
        `update expenses
         set expense_date = $3,
             purchase_date = $3,
             amount = $4,
             currency = $5,
             concept = $6,
             category_id = $7,
             subcategory_id = $8,
             payment_method_option_id = $9,
             bank_option_id = $10,
             payment_method_kind = $11,
             bank = $12,
             card_type = $13,
             installment_count = $14,
             first_installment_date = $15,
             paid_by_user_id = $16,
             allocation_mode = $17
         where tenant_id = $1 and id = $2 and ($18::uuid is null or financial_account_id = $18)`,
        [
          input.tenantId,
          input.expenseId,
          purchaseDate,
          totalAmount,
          input.currency ?? row.currency,
          input.concept ?? row.concept,
          input.categoryId ?? row.category_id,
          Object.prototype.hasOwnProperty.call(input, 'subcategoryId') ? input.subcategoryId ?? null : row.subcategory_id ?? null,
          Object.prototype.hasOwnProperty.call(input, 'paymentMethodOptionId') ? input.paymentMethodOptionId ?? null : row.payment_method_option_id ?? null,
          Object.prototype.hasOwnProperty.call(input, 'bankOptionId') ? input.bankOptionId ?? null : row.bank_option_id ?? null,
          paymentMethodKind,
          paymentBank,
          paymentCardType,
          installmentCount,
          firstInstallmentDate,
          paidByUserId,
          allocationMode,
          input.financialAccountId ?? null
        ]
      );

      await replaceExpenseInstallments(client, input.expenseId, totalAmount, installmentCount, firstInstallmentDate);
      if (input.financialAccountId && Object.prototype.hasOwnProperty.call(input, 'allocations')) {
        await replaceExpenseAllocations(client, input.expenseId, input.financialAccountId, input.allocations ?? []);
      }
      const projected = await client.query(expenseProjectionSelectSql({ whereClause: 'where e.tenant_id = $1 and e.id = $2', limitClause: 'limit 1' }), [input.tenantId, input.expenseId]);
      await client.query('commit');
      const expenses = await attachExpenseAllocations(client, projected.rows.map(mapExpense));
      return expenses[0];
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
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
    const result = await this.pool.query(
      `${expenseProjectionSelectSql({
        whereClause: `where e.tenant_id = $1
         and ($2::uuid is null or e.financial_account_id = $2)
         and ($3::timestamptz is null or i.due_date >= $3)
         and ($4::timestamptz is null or i.due_date <= $4)
         and ($5::uuid is null or e.category_id = $5 or e.subcategory_id = $5)
         and ($6::char(3) is null or e.currency = $6)
         and ($7::text is null or e.payment_method_kind = $7)`,
        orderClause: 'order by i.due_date desc, i.installment_number asc, e.created_at desc',
        limitClause: 'limit $8'
      })}`,
      [
        input.tenantId,
        input.financialAccountId ?? null,
        input.from ?? null,
        input.to ?? null,
        input.categoryId ?? null,
        input.currency ?? null,
        input.paymentMethodKind ?? null,
        input.limit
      ]
    );
    return attachExpenseAllocations(this.pool, result.rows.map(mapExpense));
  }

  async listRecent(tenantId: string, financialAccountIdOrLimit?: string | number, limitMaybe?: number) {
    const { financialAccountId, limit } = normalizeScopedRecentArgs(financialAccountIdOrLimit, limitMaybe);
    const result = await this.pool.query(
      `${expenseProjectionSelectSql({
        whereClause: 'where e.tenant_id = $1 and ($2::uuid is null or e.financial_account_id = $2)',
        orderClause: 'order by i.due_date desc, i.installment_number asc, e.created_at desc',
        limitClause: 'limit $3'
      })}`,
      [tenantId, financialAccountId ?? null, limit]
    );
    return attachExpenseAllocations(this.pool, result.rows.map(mapExpense));
  }

  async listByPeriod(tenantId: string, financialAccountIdOrFrom: string, fromOrTo?: string, toMaybe?: string) {
    const { financialAccountId, from, to } = normalizeScopedPeriodArgs(financialAccountIdOrFrom, fromOrTo, toMaybe);
    const result = await this.pool.query(
      `${expenseProjectionSelectSql({
        whereClause: 'where e.tenant_id = $1 and ($2::uuid is null or e.financial_account_id = $2) and i.due_date >= $3 and i.due_date <= $4',
        orderClause: 'order by i.due_date desc, i.installment_number asc'
      })}`,
      [tenantId, financialAccountId ?? null, from, to]
    );
    return attachExpenseAllocations(this.pool, result.rows.map(mapExpense));
  }

  async yearlyMonthlyTotalsByTenant(tenantId: string, financialAccountId: string | undefined, year: number) {
    const result = await this.pool.query(
      `select
         to_char(date_trunc('month', i.due_date), 'YYYY-MM') as period_key,
         e.currency,
         sum(i.amount) as total
       from expenses e
       join expense_installments i on i.expense_id = e.id
       where e.tenant_id = $1
         and ($2::uuid is null or e.financial_account_id = $2)
         and extract(year from i.due_date at time zone 'UTC') = $3
       group by 1, 2
       order by 1, 2`,
      [tenantId, financialAccountId ?? null, year]
    );
    return result.rows.map(mapCurrencyTotalByPeriod);
  }

  async monthlyDailyTotalsByTenant(tenantId: string, financialAccountId: string | undefined, month: string) {
    const result = await this.pool.query(
      `select
         to_char(date_trunc('day', i.due_date), 'YYYY-MM-DD') as period_key,
         e.currency,
         sum(i.amount) as total
       from expenses e
       join expense_installments i on i.expense_id = e.id
       where e.tenant_id = $1
         and ($2::uuid is null or e.financial_account_id = $2)
         and to_char(i.due_date at time zone 'UTC', 'YYYY-MM') = $3
       group by 1, 2
       order by 1, 2`,
      [tenantId, financialAccountId ?? null, month]
    );
    return result.rows.map(mapCurrencyTotalByPeriod);
  }

  async weeklyDailyTotalsByTenant(tenantId: string, financialAccountId: string | undefined, weekStartIsoDate: string) {
    const result = await this.pool.query(
      `select
         to_char(date_trunc('day', i.due_date), 'YYYY-MM-DD') as period_key,
         e.currency,
         sum(i.amount) as total
       from expenses e
       join expense_installments i on i.expense_id = e.id
       where e.tenant_id = $1
         and ($2::uuid is null or e.financial_account_id = $2)
         and i.due_date >= $3::date
         and i.due_date < ($3::date + interval '7 days')
       group by 1, 2
       order by 1, 2`,
      [tenantId, financialAccountId ?? null, weekStartIsoDate]
    );
    return result.rows.map(mapCurrencyTotalByPeriod);
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
    const result = await this.pool.query(
      `select
         to_char(date_trunc('month', i.due_date), 'YYYY-MM') as period_key,
         e.currency,
         sum(i.amount) as total
       from expenses e
       join expense_installments i on i.expense_id = e.id
       where e.tenant_id = $1
         and ($2::uuid is null or e.financial_account_id = $2)
         and coalesce(e.installment_count, 1) > 1
         and i.due_date >= $3::date
         and i.due_date < ($3::date + make_interval(months => $4))
       group by 1, 2
       order by 1, 2`,
      [tenantId, financialAccountId ?? null, `${startMonth}-01`, months]
    );
    return result.rows.map(mapCurrencyTotalByPeriod);
  }

  async periodCategoryTotalsByTenant(tenantId: string, financialAccountId: string | undefined, from: string, to: string) {
    const result = await this.pool.query(
      `select
         e.category_id,
         e.subcategory_id,
         e.currency,
         sum(i.amount) as total
       from expenses e
       join expense_installments i on i.expense_id = e.id
       where e.tenant_id = $1
         and ($2::uuid is null or e.financial_account_id = $2)
         and i.due_date >= $3
         and i.due_date <= $4
       group by 1, 2, 3`,
      [tenantId, financialAccountId ?? null, from, to]
    );
    return result.rows.map(mapCategoryTotalByPeriod);
  }
}

export class PostgresIncomeRepository implements IncomeRepository {
  constructor(private readonly pool: DatabasePool) {}

  async create(input: Omit<Income, 'id'>) {
    const result = await this.pool.query(
      `insert into incomes (tenant_id, financial_account_id, user_id, income_date, amount, currency, concept)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning *`,
      [input.tenantId, input.financialAccountId ?? null, input.userId, input.date, input.amount, input.currency, input.concept]
    );
    return mapIncome(result.rows[0]);
  }

  async delete(input: { tenantId: string; financialAccountId?: string; incomeId: string }) {
    const result = await this.pool.query(
      `delete from incomes
       where tenant_id = $1 and id = $2 and ($3::uuid is null or financial_account_id = $3)`,
      [input.tenantId, input.incomeId, input.financialAccountId ?? null]
    );
    return result.rowCount === 1;
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
    const result = await this.pool.query(
      `update incomes
       set income_date = coalesce($3, income_date),
           amount = coalesce($4, amount),
           currency = coalesce($5, currency),
           concept = coalesce($6, concept)
       where tenant_id = $1 and id = $2 and ($7::uuid is null or financial_account_id = $7)
       returning *`,
      [input.tenantId, input.incomeId, input.date ?? null, input.amount ?? null, input.currency ?? null, input.concept ?? null, input.financialAccountId ?? null]
    );
    return result.rows[0] ? mapIncome(result.rows[0]) : undefined;
  }

  async list(input: {
    tenantId: string;
    financialAccountId?: string;
    from?: string;
    to?: string;
    currency?: string;
    limit: number;
  }) {
    const result = await this.pool.query(
      `select *
       from incomes
       where tenant_id = $1
         and ($2::uuid is null or financial_account_id = $2)
         and ($3::timestamptz is null or income_date >= $3)
         and ($4::timestamptz is null or income_date <= $4)
         and ($5::char(3) is null or currency = $5)
       order by income_date desc, created_at desc
       limit $6`,
      [input.tenantId, input.financialAccountId ?? null, input.from ?? null, input.to ?? null, input.currency ?? null, input.limit]
    );
    return result.rows.map(mapIncome);
  }

  async listByPeriod(tenantId: string, financialAccountIdOrFrom: string, fromOrTo?: string, toMaybe?: string) {
    const { financialAccountId, from, to } = normalizeScopedPeriodArgs(financialAccountIdOrFrom, fromOrTo, toMaybe);
    const result = await this.pool.query(
      `select * from incomes
       where tenant_id = $1
         and ($2::uuid is null or financial_account_id = $2)
         and income_date >= $3
         and income_date <= $4
       order by income_date desc`,
      [tenantId, financialAccountId ?? null, from, to]
    );
    return result.rows.map(mapIncome);
  }

  async listRecent(tenantId: string, financialAccountIdOrLimit?: string | number, limitMaybe?: number) {
    const { financialAccountId, limit } = normalizeScopedRecentArgs(financialAccountIdOrLimit, limitMaybe);
    const result = await this.pool.query(
      `select * from incomes
       where tenant_id = $1
         and ($2::uuid is null or financial_account_id = $2)
       order by income_date desc, created_at desc
       limit $3`,
      [tenantId, financialAccountId ?? null, limit]
    );
    return result.rows.map(mapIncome);
  }

  async yearlyMonthlyTotalsByTenant(tenantId: string, financialAccountId: string | undefined, year: number) {
    const result = await this.pool.query(
      `select
         to_char(date_trunc('month', income_date), 'YYYY-MM') as period_key,
         currency,
         sum(amount) as total
       from incomes
       where tenant_id = $1
         and ($2::uuid is null or financial_account_id = $2)
         and extract(year from income_date at time zone 'UTC') = $3
       group by 1, 2
       order by 1, 2`,
      [tenantId, financialAccountId ?? null, year]
    );
    return result.rows.map(mapCurrencyTotalByPeriod);
  }

  async monthlyDailyTotalsByTenant(tenantId: string, financialAccountId: string | undefined, month: string) {
    const result = await this.pool.query(
      `select
         to_char(date_trunc('day', income_date), 'YYYY-MM-DD') as period_key,
         currency,
         sum(amount) as total
       from incomes
       where tenant_id = $1
         and ($2::uuid is null or financial_account_id = $2)
         and to_char(income_date at time zone 'UTC', 'YYYY-MM') = $3
       group by 1, 2
       order by 1, 2`,
      [tenantId, financialAccountId ?? null, month]
    );
    return result.rows.map(mapCurrencyTotalByPeriod);
  }
}

export class PostgresBudgetRepository implements BudgetRepository {
  constructor(private readonly pool: DatabasePool) {}

  async upsertMonthly(input: Omit<MonthlyBudget, 'id'>) {
    const result = await this.pool.query(
      `insert into monthly_budgets (tenant_id, financial_account_id, budget_month, category_id, subcategory_id, amount, currency)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (tenant_id, financial_account_id, budget_month, category_id, subcategory_key)
       do update set amount = excluded.amount, currency = excluded.currency, updated_at = now()
       returning *`,
      [input.tenantId, input.financialAccountId ?? null, PERMANENT_BUDGET_MONTH, input.categoryId, input.subcategoryId ?? null, input.amount, input.currency]
    );
    return mapBudget(result.rows[0]);
  }

  async listMonthly(tenantId: string, financialAccountId?: string) {
    const result = await this.pool.query(
      `select *
       from monthly_budgets
       where tenant_id = $1
         and budget_month = $2
         and ($3::uuid is null or financial_account_id = $3)
       order by created_at`,
      [tenantId, PERMANENT_BUDGET_MONTH, financialAccountId ?? null]
    );
    return result.rows.map(mapBudget);
  }
}

export class PostgresMessagingMessageAuditRepository implements MessagingMessageAuditRepository {
  constructor(private readonly pool: DatabasePool) {}

  async reserve(input: Parameters<MessagingMessageAuditRepository['reserve']>[0]) {
    const result = await this.pool.query(
      `insert into messaging_messages (provider_message_id, channel, from_phone_number, message, parsing_status)
       values ($1, $2, $3, $4, 'processing')
       on conflict (channel, provider_message_id) where provider_message_id is not null do nothing
       returning id`,
      [input.providerMessageId, input.channel ?? 'whatsapp', input.fromPhoneNumber, input.message]
    );

    return result.rowCount === 1;
  }

  async updateByProviderMessageId(
    providerMessageId: string,
    input: Parameters<MessagingMessageAuditRepository['updateByProviderMessageId']>[1]
  ) {
    await this.pool.query(
      `update messaging_messages
       set tenant_id = $2,
           user_id = $3,
           parsing_status = $4,
           expense_id = $5
       where provider_message_id = $1 and channel = $6`,
      [
        providerMessageId,
        input.tenantId ?? null,
        input.userId ?? null,
        input.parsingStatus,
        input.expenseId ?? null,
        input.channel ?? 'whatsapp'
      ]
    );
  }

  async create(input: Parameters<MessagingMessageAuditRepository['create']>[0]) {
    await this.pool.query(
      `insert into messaging_messages (provider_message_id, channel, tenant_id, user_id, from_phone_number, message, parsing_status, expense_id)
       values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        input.providerMessageId ?? null,
        input.channel ?? 'whatsapp',
        input.tenantId ?? null,
        input.userId ?? null,
        input.fromPhoneNumber,
        input.message,
        input.parsingStatus,
        input.expenseId ?? null
      ]
    );
  }

  async existsRecentDuplicate(input: {
    channel?: 'whatsapp' | 'telegram';
    fromPhoneNumber: string;
    message: string;
    since: Date;
    excludeProviderMessageId?: string;
  }) {
    const result = await this.pool.query(
      `select 1
       from messaging_messages
       where channel = $1
         and from_phone_number = $2
         and lower(trim(message)) = lower(trim($3))
         and parsing_status = 'saved'
         and created_at >= $4
         and ($5::text is null or provider_message_id <> $5)
       limit 1`,
      [
        input.channel ?? 'whatsapp',
        input.fromPhoneNumber,
        input.message,
        input.since,
        input.excludeProviderMessageId ?? null
      ]
    );

    return result.rowCount === 1;
  }
}

export class PostgresMessagingPendingDraftRepository implements MessagingPendingDraftRepository {
  constructor(private readonly pool: DatabasePool) {}

  async findActive(tenantId: string, userId: string, now: Date, channel = 'whatsapp') {
    const result = await this.pool.query(
      `select *
       from messaging_pending_drafts
       where tenant_id = $1 and user_id = $2 and expires_at >= $3 and channel = $4
       order by updated_at desc
       limit 1`,
      [tenantId, userId, now, channel]
    );
    return result.rows[0] ? mapPendingDraft(result.rows[0]) : undefined;
  }

  async upsert(input: Omit<ConversationPendingDraft, 'id'>) {
    const result = await this.pool.query(
      `insert into messaging_pending_drafts (
        tenant_id, user_id, channel, original_message, draft_json, missing_fields, expires_at
      )
      values ($1, $2, $3, $4, $5, $6, $7)
      on conflict (tenant_id, user_id, channel)
      do update set
        original_message = excluded.original_message,
        draft_json = excluded.draft_json,
        missing_fields = excluded.missing_fields,
        expires_at = excluded.expires_at,
        updated_at = now()
      returning *`,
      [
        input.tenantId,
        input.userId,
        input.channel ?? 'whatsapp',
        input.originalMessage,
        JSON.stringify(input.draft),
        input.missingFields,
        input.expiresAt
      ]
    );
    return mapPendingDraft(result.rows[0]);
  }

  async clear(tenantId: string, userId: string, channel = 'whatsapp') {
    await this.pool.query(
      `delete from messaging_pending_drafts where tenant_id = $1 and user_id = $2 and channel = $3`,
      [tenantId, userId, channel]
    );
  }
}

export class PostgresReportDispatchRepository implements ReportDispatchRepository {
  constructor(private readonly pool: DatabasePool) {}

  async reserve(input: {
    tenantId: string;
    userId: string;
    channel?: 'whatsapp' | 'telegram';
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    periodFrom: string;
    periodTo: string;
  }) {
    const result = await this.pool.query(
      `insert into report_dispatches (
        tenant_id, user_id, channel, frequency, period_from, period_to, status
      )
      values ($1, $2, $3, $4, $5, $6, 'pending')
      on conflict (channel, frequency, period_from, period_to, user_id)
      where status in ('pending', 'sent')
      do nothing
      returning id`,
      [
        input.tenantId,
        input.userId,
        input.channel ?? 'whatsapp',
        input.frequency,
        input.periodFrom,
        input.periodTo
      ]
    );

    return result.rowCount === 1;
  }

  async markSent(input: {
    userId: string;
    channel?: 'whatsapp' | 'telegram';
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    periodFrom: string;
    periodTo: string;
  }) {
    await this.pool.query(
      `update report_dispatches
       set status = 'sent',
           sent_at = now(),
           error_message = null,
           updated_at = now()
       where channel = $1
         and frequency = $2
         and period_from = $3
         and period_to = $4
         and user_id = $5
         and status = 'pending'`,
      [
        input.channel ?? 'whatsapp',
        input.frequency,
        input.periodFrom,
        input.periodTo,
        input.userId
      ]
    );
  }

  async markFailed(input: {
    userId: string;
    channel?: 'whatsapp' | 'telegram';
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    periodFrom: string;
    periodTo: string;
    errorMessage: string;
  }) {
    await this.pool.query(
      `update report_dispatches
       set status = 'failed',
           error_message = $6,
           updated_at = now()
       where channel = $1
         and frequency = $2
         and period_from = $3
         and period_to = $4
         and user_id = $5
         and status = 'pending'`,
      [
        input.channel ?? 'whatsapp',
        input.frequency,
        input.periodFrom,
        input.periodTo,
        input.userId,
        input.errorMessage
      ]
    );
  }
}

export class PostgresTelegramLinkTokenRepository implements TelegramLinkTokenRepository {
  constructor(private readonly pool: DatabasePool) {}

  async create(input: { token: string; chatId: string; phoneNumber?: string; expiresAt: Date }) {
    await this.pool.query(
      `insert into telegram_link_tokens (token, chat_id, phone_number, expires_at)
       values ($1, $2, $3, $4)`,
      [input.token, input.chatId, input.phoneNumber ?? null, input.expiresAt]
    );
  }

  async consume(token: string, now: Date) {
    const result = await this.pool.query(
      `update telegram_link_tokens
       set consumed_at = $2
       where token = $1
         and consumed_at is null
         and expires_at >= $2
       returning token, chat_id, phone_number, expires_at`,
      [token, now]
    );
    if (!result.rows[0]) return undefined;
    return {
      token: result.rows[0].token,
      chatId: result.rows[0].chat_id,
      phoneNumber: result.rows[0].phone_number ?? undefined,
      expiresAt: result.rows[0].expires_at instanceof Date ? result.rows[0].expires_at.toISOString() : String(result.rows[0].expires_at)
    };
  }
}

export class PostgresEmailMagicLinkTokenRepository implements EmailMagicLinkTokenRepository {
  constructor(private readonly pool: DatabasePool) {}

  async create(input: { token: string; userId: string; expiresAt: Date }) {
    await this.pool.query(
      `insert into email_magic_link_tokens (token, user_id, expires_at)
       values ($1, $2, $3)`,
      [input.token, input.userId, input.expiresAt]
    );
  }

  async consume(token: string, now: Date) {
    const result = await this.pool.query(
      `update email_magic_link_tokens
       set consumed_at = $2
       where token = $1
         and consumed_at is null
         and expires_at >= $2
       returning token, user_id, expires_at`,
      [token, now]
    );
    if (!result.rows[0]) return undefined;
    return {
      token: result.rows[0].token,
      userId: result.rows[0].user_id,
      expiresAt: result.rows[0].expires_at instanceof Date ? result.rows[0].expires_at.toISOString() : String(result.rows[0].expires_at)
    };
  }
}

function mapRegistrationLead(row: QueryResultRow): RegistrationLead {
  return {
    id: row.id,
    firstName: row.first_name,
    email: row.email,
    preferredLanguage: row.preferred_language ?? 'es',
    phoneNumber: row.phone_number ?? undefined,
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : undefined
  };
}

function mapUser(row: QueryResultRow): User {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    email: row.email ?? undefined,
    phoneNumber: row.phone_number,
    telegramChatId: row.telegram_chat_id ?? undefined,
    telegramUsername: row.telegram_username ?? undefined,
    firstName: row.first_name,
    lastName: row.last_name,
    preferredName: row.preferred_name,
    role: row.role,
    countryOfResidence: row.country_of_residence,
    preferredCurrency: row.preferred_currency,
    preferredLanguage: row.preferred_language ?? 'es',
    reportPreferences: row.report_preferences
  };
}

function mapCategory(row: QueryResultRow): Category {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    financialAccountId: row.financial_account_id ?? undefined,
    name: row.name,
    parentId: row.parent_id ?? undefined,
    isDefault: row.is_default
  };
}

function mapBankOption(row: QueryResultRow): BankOption {
  return {
    id: row.id,
    tenantId: row.tenant_id ?? undefined,
    financialAccountId: row.financial_account_id ?? undefined,
    name: row.name,
    isDefault: row.is_default
  };
}

function mapPaymentMethodOption(row: QueryResultRow): PaymentMethodOption {
  return {
    id: row.id,
    tenantId: row.tenant_id ?? undefined,
    financialAccountId: row.financial_account_id ?? undefined,
    code: row.code,
    name: row.name,
    kind: row.kind,
    cardType: row.card_type ?? undefined,
    isDefault: row.is_default
  };
}

function mapExpense(row: QueryResultRow): Expense {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    financialAccountId: row.financial_account_id ?? undefined,
    userId: row.user_id,
    createdByUserId: row.created_by_user_id ?? undefined,
    paidByUserId: row.paid_by_user_id ?? undefined,
    allocationMode: row.allocation_mode ?? undefined,
    date: row.expense_date instanceof Date ? row.expense_date.toISOString() : row.expense_date,
    amount: Number(row.amount),
    totalAmount: row.total_amount != null ? Number(row.total_amount) : Number(row.amount),
    currency: row.currency,
    concept: row.concept,
    categoryId: row.category_id,
    subcategoryId: row.subcategory_id ?? undefined,
    paymentMethodOptionId: row.payment_method_option_id ?? undefined,
    bankOptionId: row.bank_option_id ?? undefined,
    purchaseDate: row.purchase_date ? toIsoString(row.purchase_date) : undefined,
    installmentCount: row.installment_count != null ? Number(row.installment_count) : undefined,
    installmentNumber: row.installment_number != null ? Number(row.installment_number) : undefined,
    firstInstallmentDate: row.first_installment_date ? toIsoString(row.first_installment_date) : undefined,
    paymentMethod: {
      kind: row.payment_method_kind,
      bank: row.bank ?? undefined,
      cardType: row.card_type ?? undefined
    },
    originalMessage: row.original_message ?? undefined
  };
}

function mapIncome(row: QueryResultRow): Income {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    financialAccountId: row.financial_account_id ?? undefined,
    userId: row.user_id,
    date: row.income_date instanceof Date ? row.income_date.toISOString() : row.income_date,
    amount: Number(row.amount),
    currency: row.currency,
    concept: row.concept
  };
}

function mapBudget(row: QueryResultRow): MonthlyBudget {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    financialAccountId: row.financial_account_id ?? undefined,
    categoryId: row.category_id,
    subcategoryId: row.subcategory_id ?? undefined,
    amount: Number(row.amount),
    currency: row.currency
  };
}

function mapPendingDraft(row: QueryResultRow): ConversationPendingDraft {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    originalMessage: row.original_message,
    draft: row.draft_json,
    missingFields: row.missing_fields,
    expiresAt: row.expires_at instanceof Date ? row.expires_at.toISOString() : row.expires_at,
    channel: row.channel
  };
}

function mapCurrencyTotalByPeriod(row: QueryResultRow) {
  return {
    periodKey: row.period_key,
    currency: row.currency,
    total: Number(row.total)
  };
}

function mapCategoryTotalByPeriod(row: QueryResultRow) {
  return {
    categoryId: row.category_id,
    subcategoryId: row.subcategory_id ?? undefined,
    currency: row.currency,
    total: Number(row.total)
  };
}

function mapFinancialAccount(row: QueryResultRow): FinancialAccount {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    type: row.type,
    name: row.name,
    currency: row.currency,
    createdByUserId: row.created_by_user_id,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at)
  };
}

function mapFinancialAccountMembership(row: QueryResultRow): FinancialAccountMembershipRecord {
  return {
    account: mapFinancialAccount(row),
    role: row.membership_role
  };
}

function mapFinancialAccountMember(row: QueryResultRow): FinancialAccountMember {
  return {
    id: row.id,
    financialAccountId: row.financial_account_id,
    userId: row.user_id,
    role: row.role,
    status: row.status,
    joinedAt: row.joined_at ? toIsoString(row.joined_at) : undefined,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at)
  };
}

function mapFinancialAccountMemberProfile(row: QueryResultRow): FinancialAccountMemberProfile {
  return {
    memberId: row.member_id,
    financialAccountId: row.financial_account_id,
    userId: row.user_id,
    role: row.role,
    status: row.status,
    joinedAt: row.joined_at ? toIsoString(row.joined_at) : undefined,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    firstName: row.first_name,
    lastName: row.last_name,
    preferredName: row.preferred_name,
    email: row.email ?? undefined,
    phoneNumber: row.phone_number
  };
}

function mapFinancialAccountInvitation(row: QueryResultRow): FinancialAccountInvitation {
  return {
    id: row.id,
    financialAccountId: row.financial_account_id,
    invitedByUserId: row.invited_by_user_id ?? undefined,
    email: row.email,
    phoneNumber: row.phone_number ?? undefined,
    role: row.role,
    token: row.token,
    status: row.status,
    expiresAt: toIsoString(row.expires_at),
    acceptedAt: row.accepted_at ? toIsoString(row.accepted_at) : undefined,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at)
  };
}

function mapFinancialAccountMemberBalance(row: QueryResultRow): FinancialAccountMemberBalance {
  return {
    financialAccountId: row.financial_account_id,
    userId: row.user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    preferredName: row.preferred_name,
    currency: row.currency,
    netAmount: Number(row.net_amount)
  };
}

function mapFinancialAccountSettlement(row: QueryResultRow): FinancialAccountSettlement {
  return {
    id: row.id,
    financialAccountId: row.financial_account_id,
    recordedByUserId: row.recorded_by_user_id,
    paidByUserId: row.paid_by_user_id,
    receivedByUserId: row.received_by_user_id,
    currency: row.currency,
    amount: Number(row.amount),
    settledAt: toIsoString(row.settled_at),
    note: row.note ?? undefined,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    paidByPreferredName: row.paid_by_preferred_name ?? undefined,
    receivedByPreferredName: row.received_by_preferred_name ?? undefined,
    recordedByPreferredName: row.recorded_by_preferred_name ?? undefined
  };
}

function mapMessagingChannelContext(row: QueryResultRow): MessagingChannelContext {
  return {
    id: row.id,
    channel: row.channel,
    providerUserId: row.provider_user_id,
    userId: row.user_id,
    financialAccountId: row.financial_account_id,
    updatedAt: toIsoString(row.updated_at)
  };
}

function isForeignKeyViolation(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === '23503';
}

function expenseProjectionSelectSql(input: {
  whereClause?: string;
  orderClause?: string;
  limitClause?: string;
}) {
  return `
    select
      e.id,
      e.tenant_id,
      e.financial_account_id,
      e.user_id,
      e.created_by_user_id,
      e.paid_by_user_id,
      e.allocation_mode,
      i.due_date as expense_date,
      i.amount,
      e.amount as total_amount,
      e.currency,
      e.concept,
      e.category_id,
      e.subcategory_id,
      e.payment_method_option_id,
      e.bank_option_id,
      e.payment_method_kind,
      e.bank,
      e.card_type,
      e.original_message,
      e.purchase_date,
      e.installment_count,
      i.installment_number,
      e.first_installment_date,
      e.created_at
    from expenses e
    join expense_installments i on i.expense_id = e.id
    ${input.whereClause ?? ''}
    ${input.orderClause ?? ''}
    ${input.limitClause ?? ''}
  `;
}

async function replaceExpenseInstallments(
  client: DatabasePool | PoolClient,
  expenseId: string,
  totalAmount: number,
  installmentCount: number,
  firstInstallmentDate: string
) {
  await client.query(`delete from expense_installments where expense_id = $1`, [expenseId]);
  const schedule = buildInstallmentSchedule(totalAmount, installmentCount, firstInstallmentDate);
  for (const installment of schedule) {
    await client.query(
      `insert into expense_installments (expense_id, installment_number, installment_count, due_date, amount)
       values ($1, $2, $3, $4, $5)`,
      [expenseId, installment.installmentNumber, installmentCount, installment.dueDate, installment.amount]
    );
  }
}

async function replaceExpenseAllocations(
  client: DatabasePool | PoolClient,
  expenseId: string,
  financialAccountId: string,
  allocations: Array<{ owedByUserId: string; amount: number }>
) {
  await client.query(`delete from expense_allocations where expense_id = $1`, [expenseId]);
  for (const allocation of allocations) {
    await client.query(
      `insert into expense_allocations (expense_id, financial_account_id, owed_by_user_id, amount)
       values ($1, $2, $3, $4)`,
      [expenseId, financialAccountId, allocation.owedByUserId, allocation.amount]
    );
  }
}

async function attachExpenseAllocations(
  client: DatabasePool | PoolClient,
  expenses: Expense[]
) {
  if (!expenses.length) return expenses;
  const uniqueExpenseIds = [...new Set(expenses.map((expense) => expense.id))];
  const result = await client.query(
    `select id, expense_id, owed_by_user_id, amount
     from expense_allocations
     where expense_id = any($1::uuid[])
     order by created_at asc, id asc`,
    [uniqueExpenseIds]
  );
  const allocationsByExpenseId = result.rows.reduce<Record<string, ExpenseAllocation[]>>((acc, row) => {
    const expenseId = row.expense_id as string;
    const allocation: ExpenseAllocation = {
      id: row.id,
      expenseId,
      owedByUserId: row.owed_by_user_id,
      amount: Number(row.amount)
    };
    (acc[expenseId] ??= []).push(allocation);
    return acc;
  }, {});
  return expenses.map((expense) => ({
    ...expense,
    allocations: allocationsByExpenseId[expense.id] ?? expense.allocations
  }));
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

function buildInstallmentSchedule(totalAmount: number, installmentCount: number, firstInstallmentDate: string) {
  const normalizedInstallmentCount = Math.max(1, installmentCount);
  const centsTotal = Math.round(totalAmount * 100);
  const baseAmount = Math.floor(centsTotal / normalizedInstallmentCount);
  let remainder = centsTotal - (baseAmount * normalizedInstallmentCount);
  const firstDate = new Date(firstInstallmentDate);

  return Array.from({ length: normalizedInstallmentCount }, (_, index) => {
    const cents = baseAmount + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
    return {
      installmentNumber: index + 1,
      amount: cents / 100,
      dueDate: addMonthsClamped(firstDate, index).toISOString()
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

function buildSettlementSuggestions(
  balances: FinancialAccountMemberBalance[]
): FinancialAccountSettlementSuggestion[] {
  const suggestions: FinancialAccountSettlementSuggestion[] = [];
  const debtors = balances
    .filter((balance) => balance.netAmount < 0)
    .map((balance) => ({ ...balance, remaining: Math.abs(balance.netAmount) }))
    .sort((left, right) => right.remaining - left.remaining);
  const creditors = balances
    .filter((balance) => balance.netAmount > 0)
    .map((balance) => ({ ...balance, remaining: balance.netAmount }))
    .sort((left, right) => right.remaining - left.remaining);

  let debtorIndex = 0;
  let creditorIndex = 0;
  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = roundTwoDecimals(Math.min(debtor.remaining, creditor.remaining));
    if (amount > 0) {
      suggestions.push({
        financialAccountId: debtor.financialAccountId,
        fromUserId: debtor.userId,
        fromPreferredName: debtor.preferredName,
        toUserId: creditor.userId,
        toPreferredName: creditor.preferredName,
        currency: debtor.currency,
        amount
      });
    }

    debtor.remaining = roundTwoDecimals(debtor.remaining - amount);
    creditor.remaining = roundTwoDecimals(creditor.remaining - amount);
    if (debtor.remaining <= 0.009) debtorIndex += 1;
    if (creditor.remaining <= 0.009) creditorIndex += 1;
  }

  return suggestions;
}

function roundTwoDecimals(value: number) {
  return Number(value.toFixed(2));
}

function toIsoString(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

