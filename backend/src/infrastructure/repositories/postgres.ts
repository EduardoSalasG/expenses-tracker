import type { QueryResultRow } from 'pg';
import type { BankOptionRepository, BudgetRepository, CategoryRepository, EmailMagicLinkTokenRepository, ExpenseRepository, IncomeRepository, MessagingMessageAuditRepository, MessagingPendingDraftRepository, OtpRepository, PaymentMethodOptionRepository, ReportDispatchRepository, TelegramLinkTokenRepository, UserRepository } from '../../application/ports.js';
import type { BankOption, Category, ConversationPendingDraft, Expense, Income, MonthlyBudget, PaymentMethodOption, ReportFrequency, User } from '../../domain/index.js';
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

  async listByTenant(tenantId: string) {
    const result = await this.pool.query(
      `select * from categories where tenant_id = $1 order by parent_id nulls first, name`,
      [tenantId]
    );
    return result.rows.map(mapCategory);
  }

  async create(input: Omit<Category, 'id'>) {
    const result = await this.pool.query(
      `insert into categories (tenant_id, name, parent_id, is_default)
       values ($1, $2, $3, $4)
       returning *`,
      [input.tenantId, input.name, input.parentId ?? null, input.isDefault]
    );
    return mapCategory(result.rows[0]);
  }

  async ensureDefaults(tenantId: string) {
    await this.pool.query('select seed_default_categories($1)', [tenantId]);
  }
}

export class PostgresBankOptionRepository implements BankOptionRepository {
  constructor(private readonly pool: DatabasePool) {}

  async listByTenant(tenantId: string) {
    const result = await this.pool.query(
      `select * from bank_options
       where tenant_id is null or tenant_id = $1
       order by is_default desc, name`,
      [tenantId]
    );
    return result.rows.map(mapBankOption);
  }

  async findAccessibleById(tenantId: string, bankOptionId: string) {
    const result = await this.pool.query(
      `select * from bank_options
       where id = $1 and (tenant_id is null or tenant_id = $2)`,
      [bankOptionId, tenantId]
    );
    return result.rows[0] ? mapBankOption(result.rows[0]) : undefined;
  }

  async create(input: Omit<BankOption, 'id'>) {
    const result = await this.pool.query(
      `insert into bank_options (tenant_id, name, is_default)
       values ($1, $2, $3)
       returning *`,
      [input.tenantId ?? null, input.name, input.isDefault]
    );
    return mapBankOption(result.rows[0]);
  }

  async update(input: { tenantId: string; bankOptionId: string; name: string }) {
    const result = await this.pool.query(
      `update bank_options
       set name = $3,
           updated_at = now()
       where id = $1 and tenant_id = $2 and is_default = false
       returning *`,
      [input.bankOptionId, input.tenantId, input.name]
    );
    return result.rows[0] ? mapBankOption(result.rows[0]) : undefined;
  }

  async delete(input: { tenantId: string; bankOptionId: string }) {
    try {
      const result = await this.pool.query(
        `delete from bank_options
         where id = $1 and tenant_id = $2 and is_default = false`,
        [input.bankOptionId, input.tenantId]
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

  async listByTenant(tenantId: string) {
    const result = await this.pool.query(
      `select * from payment_method_options
       where tenant_id is null or tenant_id = $1
       order by is_default desc, name`,
      [tenantId]
    );
    return result.rows.map(mapPaymentMethodOption);
  }

  async findAccessibleById(tenantId: string, paymentMethodOptionId: string) {
    const result = await this.pool.query(
      `select * from payment_method_options
       where id = $1 and (tenant_id is null or tenant_id = $2)`,
      [paymentMethodOptionId, tenantId]
    );
    return result.rows[0] ? mapPaymentMethodOption(result.rows[0]) : undefined;
  }

  async create(input: Omit<PaymentMethodOption, 'id'>) {
    const result = await this.pool.query(
      `insert into payment_method_options (tenant_id, code, name, kind, card_type, is_default)
       values ($1, $2, $3, $4, $5, $6)
       returning *`,
      [input.tenantId ?? null, input.code, input.name, input.kind, input.cardType ?? null, input.isDefault]
    );
    return mapPaymentMethodOption(result.rows[0]);
  }

  async update(input: {
    tenantId: string;
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
       where id = $1 and tenant_id = $2 and is_default = false
       returning *`,
      [input.paymentMethodOptionId, input.tenantId, input.code, input.name, input.kind, input.cardType ?? null]
    );
    return result.rows[0] ? mapPaymentMethodOption(result.rows[0]) : undefined;
  }

  async delete(input: { tenantId: string; paymentMethodOptionId: string }) {
    try {
      const result = await this.pool.query(
        `delete from payment_method_options
         where id = $1 and tenant_id = $2 and is_default = false`,
        [input.paymentMethodOptionId, input.tenantId]
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
    const result = await this.pool.query(
      `insert into expenses (
        tenant_id, user_id, expense_date, amount, currency, concept, category_id, subcategory_id,
        payment_method_option_id, bank_option_id, payment_method_kind, bank, card_type, original_message
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      returning *`,
      [
        input.tenantId,
        input.userId,
        input.date,
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
        input.originalMessage ?? null
      ]
    );
    return mapExpense(result.rows[0]);
  }

  async update(input: {
    tenantId: string;
    expenseId: string;
    date?: string;
    amount?: number;
    currency?: string;
    concept?: string;
    categoryId?: string;
    subcategoryId?: string | null;
    paymentMethodOptionId?: string | null;
    bankOptionId?: string | null;
    paymentMethod?: Expense['paymentMethod'];
  }) {
    const result = await this.pool.query(
      `update expenses
       set expense_date = coalesce($3, expense_date),
           amount = coalesce($4, amount),
           currency = coalesce($5, currency),
           concept = coalesce($6, concept),
           category_id = coalesce($7, category_id),
           subcategory_id = case when $8::boolean then $9::uuid else subcategory_id end,
           payment_method_option_id = case when $10::boolean then $11::uuid else payment_method_option_id end,
           bank_option_id = case when $12::boolean then $13::uuid else bank_option_id end,
           payment_method_kind = coalesce($14, payment_method_kind),
           bank = case when $15::boolean then $16 else bank end,
           card_type = case when $17::boolean then $18 else card_type end
       where tenant_id = $1 and id = $2
       returning *`,
      [
        input.tenantId,
        input.expenseId,
        input.date ?? null,
        input.amount ?? null,
        input.currency ?? null,
        input.concept ?? null,
        input.categoryId ?? null,
        Object.prototype.hasOwnProperty.call(input, 'subcategoryId'),
        input.subcategoryId ?? null,
        Object.prototype.hasOwnProperty.call(input, 'paymentMethodOptionId'),
        input.paymentMethodOptionId ?? null,
        Object.prototype.hasOwnProperty.call(input, 'bankOptionId'),
        input.bankOptionId ?? null,
        input.paymentMethod?.kind ?? null,
        Object.prototype.hasOwnProperty.call(input, 'paymentMethod'),
        input.paymentMethod?.bank ?? null,
        Object.prototype.hasOwnProperty.call(input, 'paymentMethod'),
        input.paymentMethod?.cardType ?? null
      ]
    );
    return result.rows[0] ? mapExpense(result.rows[0]) : undefined;
  }

  async list(input: {
    tenantId: string;
    from?: string;
    to?: string;
    categoryId?: string;
    currency?: string;
    paymentMethodKind?: 'cash' | 'card' | 'transfer';
    limit: number;
  }) {
    const result = await this.pool.query(
      `select *
       from expenses
       where tenant_id = $1
         and ($2::timestamptz is null or expense_date >= $2)
         and ($3::timestamptz is null or expense_date <= $3)
         and ($4::uuid is null or category_id = $4)
         and ($5::char(3) is null or currency = $5)
         and ($6::text is null or payment_method_kind = $6)
       order by expense_date desc, created_at desc
       limit $7`,
      [
        input.tenantId,
        input.from ?? null,
        input.to ?? null,
        input.categoryId ?? null,
        input.currency ?? null,
        input.paymentMethodKind ?? null,
        input.limit
      ]
    );
    return result.rows.map(mapExpense);
  }

  async listRecent(tenantId: string, limit: number) {
    const result = await this.pool.query(
      `select * from expenses where tenant_id = $1 order by expense_date desc, created_at desc limit $2`,
      [tenantId, limit]
    );
    return result.rows.map(mapExpense);
  }

  async listByPeriod(tenantId: string, from: string, to: string) {
    const result = await this.pool.query(
      `select * from expenses where tenant_id = $1 and expense_date >= $2 and expense_date <= $3 order by expense_date desc`,
      [tenantId, from, to]
    );
    return result.rows.map(mapExpense);
  }

  async yearlyMonthlyTotalsByTenant(tenantId: string, year: number) {
    const result = await this.pool.query(
      `select * from yearly_expenses_monthly_totals_by_tenant($1, $2)`,
      [tenantId, year]
    );
    return result.rows.map(mapCurrencyTotalByPeriod);
  }

  async monthlyDailyTotalsByTenant(tenantId: string, month: string) {
    const result = await this.pool.query(
      `select * from monthly_expenses_daily_totals_by_tenant($1, $2::date)`,
      [tenantId, `${month}-01`]
    );
    return result.rows.map(mapCurrencyTotalByPeriod);
  }

  async weeklyDailyTotalsByTenant(tenantId: string, weekStartIsoDate: string) {
    const result = await this.pool.query(
      `select * from weekly_expenses_daily_totals_by_tenant($1, $2::date)`,
      [tenantId, weekStartIsoDate]
    );
    return result.rows.map(mapCurrencyTotalByPeriod);
  }

  async periodCategoryTotalsByTenant(tenantId: string, from: string, to: string) {
    const result = await this.pool.query(
      `select * from period_expense_category_totals_by_tenant($1, $2, $3)`,
      [tenantId, from, to]
    );
    return result.rows.map(mapCategoryTotalByPeriod);
  }
}

export class PostgresIncomeRepository implements IncomeRepository {
  constructor(private readonly pool: DatabasePool) {}

  async create(input: Omit<Income, 'id'>) {
    const result = await this.pool.query(
      `insert into incomes (tenant_id, user_id, income_date, amount, currency, concept)
       values ($1, $2, $3, $4, $5, $6)
       returning *`,
      [input.tenantId, input.userId, input.date, input.amount, input.currency, input.concept]
    );
    return mapIncome(result.rows[0]);
  }

  async update(input: {
    tenantId: string;
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
       where tenant_id = $1 and id = $2
       returning *`,
      [input.tenantId, input.incomeId, input.date ?? null, input.amount ?? null, input.currency ?? null, input.concept ?? null]
    );
    return result.rows[0] ? mapIncome(result.rows[0]) : undefined;
  }

  async list(input: {
    tenantId: string;
    from?: string;
    to?: string;
    currency?: string;
    limit: number;
  }) {
    const result = await this.pool.query(
      `select *
       from incomes
       where tenant_id = $1
         and ($2::timestamptz is null or income_date >= $2)
         and ($3::timestamptz is null or income_date <= $3)
         and ($4::char(3) is null or currency = $4)
       order by income_date desc, created_at desc
       limit $5`,
      [input.tenantId, input.from ?? null, input.to ?? null, input.currency ?? null, input.limit]
    );
    return result.rows.map(mapIncome);
  }

  async listByPeriod(tenantId: string, from: string, to: string) {
    const result = await this.pool.query(
      `select * from incomes where tenant_id = $1 and income_date >= $2 and income_date <= $3 order by income_date desc`,
      [tenantId, from, to]
    );
    return result.rows.map(mapIncome);
  }

  async listRecent(tenantId: string, limit: number) {
    const result = await this.pool.query(
      `select * from incomes where tenant_id = $1 order by income_date desc, created_at desc limit $2`,
      [tenantId, limit]
    );
    return result.rows.map(mapIncome);
  }

  async yearlyMonthlyTotalsByTenant(tenantId: string, year: number) {
    const result = await this.pool.query(
      `select * from yearly_incomes_monthly_totals_by_tenant($1, $2)`,
      [tenantId, year]
    );
    return result.rows.map(mapCurrencyTotalByPeriod);
  }

  async monthlyDailyTotalsByTenant(tenantId: string, month: string) {
    const result = await this.pool.query(
      `select * from monthly_incomes_daily_totals_by_tenant($1, $2::date)`,
      [tenantId, `${month}-01`]
    );
    return result.rows.map(mapCurrencyTotalByPeriod);
  }
}

export class PostgresBudgetRepository implements BudgetRepository {
  constructor(private readonly pool: DatabasePool) {}

  async upsertMonthly(input: Omit<MonthlyBudget, 'id'>) {
    const result = await this.pool.query(
      `insert into monthly_budgets (tenant_id, budget_month, category_id, subcategory_id, amount, currency)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (tenant_id, budget_month, category_id, subcategory_key)
       do update set amount = excluded.amount, currency = excluded.currency, updated_at = now()
       returning *`,
      [input.tenantId, PERMANENT_BUDGET_MONTH, input.categoryId, input.subcategoryId ?? null, input.amount, input.currency]
    );
    return mapBudget(result.rows[0]);
  }

  async listMonthly(tenantId: string) {
    const result = await this.pool.query(
      `select * from monthly_budgets where tenant_id = $1 and budget_month = $2 order by created_at`,
      [tenantId, PERMANENT_BUDGET_MONTH]
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
    name: row.name,
    parentId: row.parent_id ?? undefined,
    isDefault: row.is_default
  };
}

function mapBankOption(row: QueryResultRow): BankOption {
  return {
    id: row.id,
    tenantId: row.tenant_id ?? undefined,
    name: row.name,
    isDefault: row.is_default
  };
}

function mapPaymentMethodOption(row: QueryResultRow): PaymentMethodOption {
  return {
    id: row.id,
    tenantId: row.tenant_id ?? undefined,
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
    userId: row.user_id,
    date: row.expense_date instanceof Date ? row.expense_date.toISOString() : row.expense_date,
    amount: Number(row.amount),
    currency: row.currency,
    concept: row.concept,
    categoryId: row.category_id,
    subcategoryId: row.subcategory_id ?? undefined,
    paymentMethodOptionId: row.payment_method_option_id ?? undefined,
    bankOptionId: row.bank_option_id ?? undefined,
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

function isForeignKeyViolation(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === '23503';
}

