import type { QueryResultRow } from 'pg';
import type { BudgetRepository, CategoryRepository, ExpenseRepository, IncomeRepository, MessagingMessageAuditRepository, MessagingPendingDraftRepository, OtpRepository, UserRepository } from '../../application/ports.js';
import type { Category, ConversationPendingDraft, Expense, Income, MonthlyBudget, ReportFrequency, User } from '../../domain/index.js';
import type { DatabasePool } from '../database.js';

export class PostgresUserRepository implements UserRepository {
  constructor(private readonly pool: DatabasePool) {}

  async findByPhoneNumber(phoneNumber: string) {
    const result = await this.pool.query('select * from users where phone_number = $1', [phoneNumber]);
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
      `select * from upsert_user_by_phone($1, $2, $3, $4, $5, $6, $7)`,
      [
        input.phoneNumber,
        input.firstName,
        input.lastName,
        input.preferredName,
        input.email ?? null,
        input.countryOfResidence,
        input.preferredCurrency
      ]
    );
    return mapUser(result.rows[0]);
  }

  async updateProfile(userId: string, input: Pick<User, 'firstName' | 'lastName' | 'preferredName' | 'email' | 'countryOfResidence' | 'preferredCurrency'>) {
    const result = await this.pool.query(
      `update users
       set first_name = $2,
           last_name = $3,
           preferred_name = $4,
           email = $5,
           country_of_residence = $6,
           preferred_currency = $7,
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
        input.preferredCurrency
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

export class PostgresExpenseRepository implements ExpenseRepository {
  constructor(private readonly pool: DatabasePool) {}

  async create(input: Omit<Expense, 'id'>) {
    const result = await this.pool.query(
      `insert into expenses (
        tenant_id, user_id, expense_date, amount, currency, concept, category_id, subcategory_id,
        payment_method_kind, bank, card_type, original_message
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
        input.paymentMethod.kind,
        input.paymentMethod.bank ?? null,
        input.paymentMethod.cardType ?? null,
        input.originalMessage ?? null
      ]
    );
    return mapExpense(result.rows[0]);
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
      [input.tenantId, `${input.month}-01`, input.categoryId, input.subcategoryId ?? null, input.amount, input.currency]
    );
    return mapBudget(result.rows[0]);
  }

  async listMonthly(tenantId: string, month: string) {
    const result = await this.pool.query(
      `select * from monthly_budgets where tenant_id = $1 and budget_month = $2 order by created_at`,
      [tenantId, `${month}-01`]
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

function mapUser(row: QueryResultRow): User {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    email: row.email ?? undefined,
    phoneNumber: row.phone_number,
    firstName: row.first_name,
    lastName: row.last_name,
    preferredName: row.preferred_name,
    role: row.role,
    countryOfResidence: row.country_of_residence,
    preferredCurrency: row.preferred_currency,
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
  const date = row.budget_month instanceof Date ? row.budget_month.toISOString() : String(row.budget_month);
  return {
    id: row.id,
    tenantId: row.tenant_id,
    month: date.slice(0, 7),
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

export { PostgresMessagingMessageAuditRepository as PostgresWhatsAppMessageAuditRepository };
export { PostgresMessagingPendingDraftRepository as PostgresWhatsAppPendingDraftRepository };
