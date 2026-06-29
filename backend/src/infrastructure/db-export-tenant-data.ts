import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { QueryResultRow } from 'pg';
import { loadConfig } from './config.js';
import { createPool } from './database.js';
import { createLogger } from './logger.js';

const logger = createLogger();
const config = loadConfig();
const pool = createPool(config);

type ExportTarget =
  | { tenantId: string }
  | { userId: string }
  | { phoneNumber: string }
  | { email: string };

function parseArg(flag: string) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function resolveCliPath(filePath: string) {
  return path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), '..', filePath);
}

function timestamp() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function resolveTarget(): ExportTarget {
  const tenantId = parseArg('--tenant-id');
  if (tenantId) return { tenantId };

  const userId = parseArg('--user-id');
  if (userId) return { userId };

  const phoneNumber = parseArg('--phone');
  if (phoneNumber) return { phoneNumber };

  const email = parseArg('--email');
  if (email) return { email: email.trim().toLowerCase() };

  throw new Error('Expected one of: --tenant-id, --user-id, --phone, or --email.');
}

function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value instanceof Date) return `'${value.toISOString().replace(/'/g, "''")}'`;
  if (Array.isArray(value)) return `ARRAY[${value.map((item) => sqlLiteral(String(item))).join(', ')}]::text[]`;
  if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  return `'${String(value).replace(/'/g, "''")}'`;
}

function rowValue(row: QueryResultRow, key: string) {
  return Object.prototype.hasOwnProperty.call(row, key) ? row[key] : null;
}

function insertStatement(
  table: string,
  columns: string[],
  values: string[],
  conflictTarget: string,
  updateColumns: string[]
) {
  const updateClause = updateColumns.length === 0
    ? 'do nothing'
    : `do update set ${updateColumns.map((column) => `${column} = excluded.${column}`).join(', ')}`;

  return `insert into ${table} (${columns.join(', ')}) values (${values.join(', ')}) on conflict (${conflictTarget}) ${updateClause};`;
}

async function resolveTenantContext(target: ExportTarget) {
  if ('tenantId' in target) {
    return { tenantId: target.tenantId };
  }

  if ('userId' in target) {
    const result = await pool.query<{ tenant_id: string }>(
      'select tenant_id from users where id = $1',
      [target.userId]
    );
    if (!result.rows[0]) throw new Error(`User ${target.userId} was not found.`);
    return { tenantId: result.rows[0].tenant_id };
  }

  if ('phoneNumber' in target) {
    const result = await pool.query<{ tenant_id: string }>(
      'select tenant_id from users where phone_number = $1',
      [target.phoneNumber]
    );
    if (!result.rows[0]) throw new Error(`No user found with phone ${target.phoneNumber}.`);
    return { tenantId: result.rows[0].tenant_id };
  }

  const result = await pool.query<{ tenant_id: string }>(
    'select tenant_id from users where lower(email) = lower($1)',
    [target.email]
  );
  if (!result.rows[0]) throw new Error(`No user found with email ${target.email}.`);
  return { tenantId: result.rows[0].tenant_id };
}

async function exportTenant(tenantId: string, outputPath: string) {
  const tenantResult = await pool.query('select * from tenants where id = $1', [tenantId]);
  if (!tenantResult.rows[0]) throw new Error(`Tenant ${tenantId} was not found.`);

  const users = (await pool.query('select * from users where tenant_id = $1 order by created_at, id', [tenantId])).rows;
  const categories = (await pool.query('select * from categories where tenant_id = $1 order by parent_id nulls first, created_at, id', [tenantId])).rows;
  const customBanks = (await pool.query('select * from bank_options where tenant_id = $1 order by created_at, id', [tenantId])).rows;
  const customPaymentMethods = (await pool.query('select * from payment_method_options where tenant_id = $1 order by created_at, id', [tenantId])).rows;
  const expenses = (
    await pool.query(
      `select
         e.*,
         pmo.tenant_id as payment_method_option_tenant_id,
         pmo.name as payment_method_option_name,
         bo.tenant_id as bank_option_tenant_id,
         bo.name as bank_option_name
       from expenses e
       left join payment_method_options pmo on pmo.id = e.payment_method_option_id
       left join bank_options bo on bo.id = e.bank_option_id
       where e.tenant_id = $1
       order by e.created_at, e.id`,
      [tenantId]
    )
  ).rows;
  const expenseIds = expenses.map((row) => row.id as string);
  const installments = expenseIds.length === 0
    ? []
    : (
        await pool.query(
          'select * from expense_installments where expense_id = any($1::uuid[]) order by due_date, installment_number, id',
          [expenseIds]
        )
      ).rows;
  const incomes = (await pool.query('select * from incomes where tenant_id = $1 order by created_at, id', [tenantId])).rows;
  const budgets = (await pool.query('select * from monthly_budgets where tenant_id = $1 order by created_at, id', [tenantId])).rows;
  const messages = (await pool.query('select * from messaging_messages where tenant_id = $1 order by created_at, id', [tenantId])).rows;
  const drafts = (await pool.query('select * from messaging_pending_drafts where tenant_id = $1 order by created_at, id', [tenantId])).rows;
  const reportDispatches = (await pool.query('select * from report_dispatches where tenant_id = $1 order by created_at, id', [tenantId])).rows;

  const lines: string[] = [
    '-- Expenses Tracker tenant-scoped export',
    `-- Tenant ID: ${tenantId}`,
    `-- Generated at: ${new Date().toISOString()}`,
    '-- Intended target: a database already initialized with pnpm db:bootstrap',
    '-- Transient auth/link tables are excluded on purpose (otp_codes, telegram_link_tokens, email_magic_link_tokens, registration_leads).',
    'begin;'
  ];

  lines.push(
    insertStatement(
      'tenants',
      ['id', 'created_at'],
      [sqlLiteral(rowValue(tenantResult.rows[0], 'id')), sqlLiteral(rowValue(tenantResult.rows[0], 'created_at'))],
      'id',
      ['created_at']
    )
  );

  for (const row of users) {
    lines.push(
      insertStatement(
        'users',
        [
          'id',
          'tenant_id',
          'email',
          'phone_number',
          'telegram_chat_id',
          'telegram_username',
          'first_name',
          'last_name',
          'preferred_name',
          'role',
          'country_of_residence',
          'preferred_currency',
          'preferred_language',
          'report_preferences',
          'password_hash',
          'created_at',
          'updated_at'
        ],
        [
          sqlLiteral(rowValue(row, 'id')),
          sqlLiteral(rowValue(row, 'tenant_id')),
          sqlLiteral(rowValue(row, 'email')),
          sqlLiteral(rowValue(row, 'phone_number')),
          sqlLiteral(rowValue(row, 'telegram_chat_id')),
          sqlLiteral(rowValue(row, 'telegram_username')),
          sqlLiteral(rowValue(row, 'first_name')),
          sqlLiteral(rowValue(row, 'last_name')),
          sqlLiteral(rowValue(row, 'preferred_name')),
          sqlLiteral(rowValue(row, 'role')),
          sqlLiteral(rowValue(row, 'country_of_residence')),
          sqlLiteral(rowValue(row, 'preferred_currency')),
          sqlLiteral(rowValue(row, 'preferred_language') ?? 'es'),
          sqlLiteral(rowValue(row, 'report_preferences') ?? []),
          sqlLiteral(rowValue(row, 'password_hash')),
          sqlLiteral(rowValue(row, 'created_at')),
          sqlLiteral(rowValue(row, 'updated_at'))
        ],
        'id',
        [
          'tenant_id',
          'email',
          'phone_number',
          'telegram_chat_id',
          'telegram_username',
          'first_name',
          'last_name',
          'preferred_name',
          'role',
          'country_of_residence',
          'preferred_currency',
          'preferred_language',
          'report_preferences',
          'password_hash',
          'created_at',
          'updated_at'
        ]
      )
    );
  }

  for (const row of categories) {
    lines.push(
      insertStatement(
        'categories',
        ['id', 'tenant_id', 'name', 'parent_id', 'is_default', 'created_at', 'updated_at'],
        [
          sqlLiteral(rowValue(row, 'id')),
          sqlLiteral(rowValue(row, 'tenant_id')),
          sqlLiteral(rowValue(row, 'name')),
          sqlLiteral(rowValue(row, 'parent_id')),
          sqlLiteral(rowValue(row, 'is_default')),
          sqlLiteral(rowValue(row, 'created_at')),
          sqlLiteral(rowValue(row, 'updated_at'))
        ],
        'id',
        ['tenant_id', 'name', 'parent_id', 'is_default', 'created_at', 'updated_at']
      )
    );
  }

  for (const row of customBanks) {
    lines.push(
      insertStatement(
        'bank_options',
        ['id', 'tenant_id', 'name', 'is_default', 'created_at', 'updated_at'],
        [
          sqlLiteral(rowValue(row, 'id')),
          sqlLiteral(rowValue(row, 'tenant_id')),
          sqlLiteral(rowValue(row, 'name')),
          sqlLiteral(rowValue(row, 'is_default')),
          sqlLiteral(rowValue(row, 'created_at')),
          sqlLiteral(rowValue(row, 'updated_at'))
        ],
        'id',
        ['tenant_id', 'name', 'is_default', 'created_at', 'updated_at']
      )
    );
  }

  for (const row of customPaymentMethods) {
    lines.push(
      insertStatement(
        'payment_method_options',
        ['id', 'tenant_id', 'code', 'name', 'kind', 'card_type', 'is_default', 'created_at', 'updated_at'],
        [
          sqlLiteral(rowValue(row, 'id')),
          sqlLiteral(rowValue(row, 'tenant_id')),
          sqlLiteral(rowValue(row, 'code')),
          sqlLiteral(rowValue(row, 'name')),
          sqlLiteral(rowValue(row, 'kind')),
          sqlLiteral(rowValue(row, 'card_type')),
          sqlLiteral(rowValue(row, 'is_default')),
          sqlLiteral(rowValue(row, 'created_at')),
          sqlLiteral(rowValue(row, 'updated_at'))
        ],
        'id',
        ['tenant_id', 'code', 'name', 'kind', 'card_type', 'is_default', 'created_at', 'updated_at']
      )
    );
  }

  for (const row of expenses) {
    const paymentMethodOptionExpr = row.payment_method_option_id == null
      ? 'null'
      : row.payment_method_option_tenant_id == null
        ? `(select id from payment_method_options where tenant_id is null and lower(name) = lower(${sqlLiteral(row.payment_method_option_name)}) limit 1)`
        : sqlLiteral(row.payment_method_option_id);

    const bankOptionExpr = row.bank_option_id == null
      ? 'null'
      : row.bank_option_tenant_id == null
        ? `(select id from bank_options where tenant_id is null and lower(name) = lower(${sqlLiteral(row.bank_option_name)}) limit 1)`
        : sqlLiteral(row.bank_option_id);

    lines.push(
      insertStatement(
        'expenses',
        [
          'id',
          'tenant_id',
          'user_id',
          'expense_date',
          'purchase_date',
          'amount',
          'currency',
          'concept',
          'category_id',
          'subcategory_id',
          'payment_method_option_id',
          'bank_option_id',
          'payment_method_kind',
          'bank',
          'card_type',
          'original_message',
          'installment_count',
          'first_installment_date',
          'created_at',
          'updated_at'
        ],
        [
          sqlLiteral(rowValue(row, 'id')),
          sqlLiteral(rowValue(row, 'tenant_id')),
          sqlLiteral(rowValue(row, 'user_id')),
          sqlLiteral(rowValue(row, 'expense_date')),
          sqlLiteral(rowValue(row, 'purchase_date')),
          sqlLiteral(rowValue(row, 'amount')),
          sqlLiteral(rowValue(row, 'currency')),
          sqlLiteral(rowValue(row, 'concept')),
          sqlLiteral(rowValue(row, 'category_id')),
          sqlLiteral(rowValue(row, 'subcategory_id')),
          paymentMethodOptionExpr,
          bankOptionExpr,
          sqlLiteral(rowValue(row, 'payment_method_kind')),
          sqlLiteral(rowValue(row, 'bank')),
          sqlLiteral(rowValue(row, 'card_type')),
          sqlLiteral(rowValue(row, 'original_message')),
          sqlLiteral(rowValue(row, 'installment_count')),
          sqlLiteral(rowValue(row, 'first_installment_date')),
          sqlLiteral(rowValue(row, 'created_at')),
          sqlLiteral(rowValue(row, 'updated_at'))
        ],
        'id',
        [
          'tenant_id',
          'user_id',
          'expense_date',
          'purchase_date',
          'amount',
          'currency',
          'concept',
          'category_id',
          'subcategory_id',
          'payment_method_option_id',
          'bank_option_id',
          'payment_method_kind',
          'bank',
          'card_type',
          'original_message',
          'installment_count',
          'first_installment_date',
          'created_at',
          'updated_at'
        ]
      )
    );
  }

  for (const row of installments) {
    lines.push(
      insertStatement(
        'expense_installments',
        ['id', 'expense_id', 'installment_number', 'installment_count', 'due_date', 'amount', 'status', 'created_at'],
        [
          sqlLiteral(rowValue(row, 'id')),
          sqlLiteral(rowValue(row, 'expense_id')),
          sqlLiteral(rowValue(row, 'installment_number')),
          sqlLiteral(rowValue(row, 'installment_count')),
          sqlLiteral(rowValue(row, 'due_date')),
          sqlLiteral(rowValue(row, 'amount')),
          sqlLiteral(rowValue(row, 'status')),
          sqlLiteral(rowValue(row, 'created_at'))
        ],
        'id',
        ['expense_id', 'installment_number', 'installment_count', 'due_date', 'amount', 'status', 'created_at']
      )
    );
  }

  for (const row of incomes) {
    lines.push(
      insertStatement(
        'incomes',
        ['id', 'tenant_id', 'user_id', 'income_date', 'amount', 'currency', 'concept', 'created_at', 'updated_at'],
        [
          sqlLiteral(rowValue(row, 'id')),
          sqlLiteral(rowValue(row, 'tenant_id')),
          sqlLiteral(rowValue(row, 'user_id')),
          sqlLiteral(rowValue(row, 'income_date')),
          sqlLiteral(rowValue(row, 'amount')),
          sqlLiteral(rowValue(row, 'currency')),
          sqlLiteral(rowValue(row, 'concept')),
          sqlLiteral(rowValue(row, 'created_at')),
          sqlLiteral(rowValue(row, 'updated_at'))
        ],
        'id',
        ['tenant_id', 'user_id', 'income_date', 'amount', 'currency', 'concept', 'created_at', 'updated_at']
      )
    );
  }

  for (const row of budgets) {
    lines.push(
      insertStatement(
        'monthly_budgets',
        ['id', 'tenant_id', 'budget_month', 'category_id', 'subcategory_id', 'amount', 'currency', 'created_at', 'updated_at'],
        [
          sqlLiteral(rowValue(row, 'id')),
          sqlLiteral(rowValue(row, 'tenant_id')),
          sqlLiteral(rowValue(row, 'budget_month')),
          sqlLiteral(rowValue(row, 'category_id')),
          sqlLiteral(rowValue(row, 'subcategory_id')),
          sqlLiteral(rowValue(row, 'amount')),
          sqlLiteral(rowValue(row, 'currency')),
          sqlLiteral(rowValue(row, 'created_at')),
          sqlLiteral(rowValue(row, 'updated_at'))
        ],
        'id',
        ['tenant_id', 'budget_month', 'category_id', 'subcategory_id', 'amount', 'currency', 'created_at', 'updated_at']
      )
    );
  }

  for (const row of messages) {
    lines.push(
      insertStatement(
        'messaging_messages',
        ['id', 'provider_message_id', 'channel', 'tenant_id', 'user_id', 'from_phone_number', 'message', 'parsing_status', 'expense_id', 'created_at'],
        [
          sqlLiteral(rowValue(row, 'id')),
          sqlLiteral(rowValue(row, 'provider_message_id')),
          sqlLiteral(rowValue(row, 'channel')),
          sqlLiteral(rowValue(row, 'tenant_id')),
          sqlLiteral(rowValue(row, 'user_id')),
          sqlLiteral(rowValue(row, 'from_phone_number')),
          sqlLiteral(rowValue(row, 'message')),
          sqlLiteral(rowValue(row, 'parsing_status')),
          sqlLiteral(rowValue(row, 'expense_id')),
          sqlLiteral(rowValue(row, 'created_at'))
        ],
        'id',
        ['provider_message_id', 'channel', 'tenant_id', 'user_id', 'from_phone_number', 'message', 'parsing_status', 'expense_id', 'created_at']
      )
    );
  }

  for (const row of drafts) {
    lines.push(
      insertStatement(
        'messaging_pending_drafts',
        ['id', 'tenant_id', 'user_id', 'channel', 'original_message', 'draft_json', 'missing_fields', 'expires_at', 'created_at', 'updated_at'],
        [
          sqlLiteral(rowValue(row, 'id')),
          sqlLiteral(rowValue(row, 'tenant_id')),
          sqlLiteral(rowValue(row, 'user_id')),
          sqlLiteral(rowValue(row, 'channel')),
          sqlLiteral(rowValue(row, 'original_message')),
          sqlLiteral(rowValue(row, 'draft_json')),
          sqlLiteral(rowValue(row, 'missing_fields') ?? []),
          sqlLiteral(rowValue(row, 'expires_at')),
          sqlLiteral(rowValue(row, 'created_at')),
          sqlLiteral(rowValue(row, 'updated_at'))
        ],
        'id',
        ['tenant_id', 'user_id', 'channel', 'original_message', 'draft_json', 'missing_fields', 'expires_at', 'created_at', 'updated_at']
      )
    );
  }

  for (const row of reportDispatches) {
    lines.push(
      insertStatement(
        'report_dispatches',
        ['id', 'tenant_id', 'user_id', 'channel', 'frequency', 'period_from', 'period_to', 'status', 'sent_at', 'error_message', 'created_at', 'updated_at'],
        [
          sqlLiteral(rowValue(row, 'id')),
          sqlLiteral(rowValue(row, 'tenant_id')),
          sqlLiteral(rowValue(row, 'user_id')),
          sqlLiteral(rowValue(row, 'channel')),
          sqlLiteral(rowValue(row, 'frequency')),
          sqlLiteral(rowValue(row, 'period_from')),
          sqlLiteral(rowValue(row, 'period_to')),
          sqlLiteral(rowValue(row, 'status')),
          sqlLiteral(rowValue(row, 'sent_at')),
          sqlLiteral(rowValue(row, 'error_message')),
          sqlLiteral(rowValue(row, 'created_at')),
          sqlLiteral(rowValue(row, 'updated_at'))
        ],
        'id',
        ['tenant_id', 'user_id', 'channel', 'frequency', 'period_from', 'period_to', 'status', 'sent_at', 'error_message', 'created_at', 'updated_at']
      )
    );
  }

  lines.push('commit;');

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${lines.join('\n')}\n`, 'utf8');
  logger.info(`Tenant-scoped data export complete: ${outputPath}`);
}

const target = resolveTarget();
const requestedOutput = parseArg('--output');
const resolvedContext = await resolveTenantContext(target);
const defaultOutput = path.resolve(
  process.cwd(),
  '..',
  'database',
  'backups',
  `expenses-tracker-tenant-${resolvedContext.tenantId}-${timestamp()}.sql`
);
const outputPath = requestedOutput ? resolveCliPath(requestedOutput) : defaultOutput;

try {
  logger.info(`Exporting tenant-scoped data for ${resolvedContext.tenantId} to ${outputPath}`);
  await exportTenant(resolvedContext.tenantId, outputPath);
} finally {
  await pool.end();
}
