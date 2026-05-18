import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createPool } from './database.js';
import { loadConfig } from './config.js';
import { createLogger } from './logger.js';

const logger = createLogger();

async function ensureSchemaMigrationsTable(pool: ReturnType<typeof createPool>) {
  await pool.query(`
    create table if not exists schema_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    )
  `);
}

async function migrationLooksApplied(pool: ReturnType<typeof createPool>, file: string) {
  const checks: Record<string, string> = {
    '001_initial_schema.sql': `select to_regclass('public.tenants') is not null as ok`,
    '002_messaging_message_id_idempotency.sql': `select to_regclass('public.messaging_messages_provider_message_id_uidx') is not null as ok`,
    '003_report_preferences_index.sql': `select to_regclass('public.users_report_preferences_gin_idx') is not null as ok`,
    '004_transfer_payment_method.sql': `select exists (
      select 1 from pg_constraint where conname = 'expenses_payment_method_kind_check'
    ) as ok`,
    '005_messaging_pending_drafts.sql': `select to_regclass('public.messaging_pending_drafts') is not null as ok`,
    '006_split_user_names.sql': `select exists (
      select 1 from information_schema.columns
      where table_name = 'users' and column_name = 'preferred_name'
    ) as ok`,
    '007_expand_default_categories.sql': `select exists (
      select 1 from pg_proc where proname = 'seed_default_categories'
    ) as ok`,
    '008_rename_whatsapp_messaging_tables.sql': `select exists (
      select 1 from information_schema.columns
      where table_name = 'messaging_messages' and column_name = 'channel'
    ) as ok`,
    '009_reporting_aggregates_by_tenant.sql': `select exists (
      select 1 from pg_proc where proname = 'yearly_expenses_monthly_totals_by_tenant'
    ) as ok`
  };

  const sql = checks[file];
  if (!sql) return false;
  const result = await pool.query<{ ok: boolean }>(sql);
  return Boolean(result.rows[0]?.ok);
}

async function runSqlDirectory(directory: string, options: { trackApplied?: boolean } = {}) {
  const config = loadConfig();
  const pool = createPool(config);
  const absoluteDirectory = path.resolve(process.cwd(), '..', directory);
  const files = (await readdir(absoluteDirectory))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  try {
    if (options.trackApplied) {
      await ensureSchemaMigrationsTable(pool);
    }

    let pendingCount = 0;
    for (const file of files) {
      if (options.trackApplied) {
        const applied = await pool.query(
          'select 1 from schema_migrations where filename = $1',
          [file]
        );
        if (applied.rowCount === 1) {
          logger.info(`Skipping ${directory}/${file} (already applied)`);
          continue;
        }

        if (await migrationLooksApplied(pool, file)) {
          await pool.query('insert into schema_migrations (filename) values ($1) on conflict (filename) do nothing', [file]);
          logger.info(`Skipping ${directory}/${file} (legacy schema detected as applied)`);
          continue;
        }
      }

      const fullPath = path.join(absoluteDirectory, file);
      const sql = await readFile(fullPath, 'utf8');
      logger.info(`Running ${directory}/${file}`);
      if (options.trackApplied) {
        await pool.query('begin');
        try {
          await pool.query(sql);
          await pool.query('insert into schema_migrations (filename) values ($1)', [file]);
          await pool.query('commit');
          pendingCount += 1;
        } catch (error) {
          await pool.query('rollback');
          throw error;
        }
      } else {
        await pool.query(sql);
      }
    }

    if (options.trackApplied) {
      logger.info(`Migrations complete. Applied ${pendingCount} pending migration(s).`);
    }
  } finally {
    await pool.end();
  }
}

async function runSqlFile(filePath: string) {
  const config = loadConfig();
  const pool = createPool(config);
  const fullPath = path.resolve(process.cwd(), '..', filePath);

  try {
    const sql = await readFile(fullPath, 'utf8');
    logger.info(`Running ${filePath}`);
    await pool.query(sql);
  } finally {
    await pool.end();
  }
}

const command = process.argv[2];

if (command === 'migrate') {
  await runSqlDirectory('database/migrations', { trackApplied: true });
} else if (command === 'seed') {
  await runSqlDirectory('database/seeds');
} else if (command === 'migrate:file') {
  const filePath = process.argv[3];
  if (!filePath) {
    throw new Error('Expected file path for migrate:file.');
  }
  await runSqlFile(filePath);
} else {
  throw new Error('Expected command: migrate, migrate:file, or seed.');
}
