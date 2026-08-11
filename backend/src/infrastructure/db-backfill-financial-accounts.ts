import { createPool } from './database.js';
import { loadConfig } from './config.js';
import { createLogger } from './logger.js';

const logger = createLogger();

type TenantOwnerRow = {
  user_id: string;
  tenant_id: string;
  created_at: string;
};

async function main() {
  const config = loadConfig();
  const pool = createPool(config);

  try {
    await pool.query('begin');

    const users = await pool.query<{ id: string }>(`
      select id
      from users
      order by created_at asc, id asc
    `);

    const ensuredAccounts = new Map<string, string>();
    for (const row of users.rows) {
      const account = await pool.query<{ account_id: string }>(
        'select ensure_personal_financial_account($1) as account_id',
        [row.id]
      );
      ensuredAccounts.set(row.id, account.rows[0].account_id);
    }

    const memberships = await pool.query(`
      insert into financial_account_members (
        financial_account_id,
        user_id,
        role,
        status,
        joined_at
      )
      select
        fa.id,
        fa.created_by_user_id,
        'owner',
        'active',
        coalesce(u.created_at, now())
      from financial_accounts fa
      join users u on u.id = fa.created_by_user_id
      where fa.type = 'personal'
      on conflict (financial_account_id, user_id)
      do update
        set role = excluded.role,
            status = excluded.status,
            joined_at = coalesce(financial_account_members.joined_at, excluded.joined_at),
            updated_at = now()
    `);

    const tenantOwners = await pool.query<TenantOwnerRow>(`
      select distinct on (u.tenant_id)
        u.id as user_id,
        u.tenant_id,
        u.created_at::text
      from users u
      order by u.tenant_id, u.created_at asc, u.id asc
    `);

    let categoryUpdates = 0;
    let budgetUpdates = 0;
    let bankUpdates = 0;
    let paymentMethodUpdates = 0;

    for (const owner of tenantOwners.rows) {
      const accountId = ensuredAccounts.get(owner.user_id);
      if (!accountId) continue;

      const categoriesResult = await pool.query(
        `update categories
         set financial_account_id = $1
         where tenant_id = $2
           and financial_account_id is null`,
        [accountId, owner.tenant_id]
      );
      categoryUpdates += categoriesResult.rowCount ?? 0;

      const budgetsResult = await pool.query(
        `update monthly_budgets
         set financial_account_id = $1
         where tenant_id = $2
           and financial_account_id is null`,
        [accountId, owner.tenant_id]
      );
      budgetUpdates += budgetsResult.rowCount ?? 0;

      const banksResult = await pool.query(
        `update bank_options
         set financial_account_id = $1
         where tenant_id = $2
           and financial_account_id is null`,
        [accountId, owner.tenant_id]
      );
      bankUpdates += banksResult.rowCount ?? 0;

      const paymentMethodsResult = await pool.query(
        `update payment_method_options
         set financial_account_id = $1
         where tenant_id = $2
           and financial_account_id is null`,
        [accountId, owner.tenant_id]
      );
      paymentMethodUpdates += paymentMethodsResult.rowCount ?? 0;
    }

    let expenseUpdates = 0;
    let incomeUpdates = 0;

    for (const [userId, accountId] of ensuredAccounts.entries()) {
      const expensesResult = await pool.query(
        `update expenses
         set financial_account_id = coalesce(financial_account_id, $1),
             created_by_user_id = coalesce(created_by_user_id, user_id),
             paid_by_user_id = coalesce(paid_by_user_id, user_id)
         where user_id = $2
           and (
             financial_account_id is null
             or created_by_user_id is null
             or paid_by_user_id is null
           )`,
        [accountId, userId]
      );
      expenseUpdates += expensesResult.rowCount ?? 0;

      const incomesResult = await pool.query(
        `update incomes
         set financial_account_id = coalesce(financial_account_id, $1)
         where user_id = $2
           and financial_account_id is null`,
        [accountId, userId]
      );
      incomeUpdates += incomesResult.rowCount ?? 0;
    }

    await pool.query('commit');

    logger.info('Financial account backfill completed.', {
      usersProcessed: users.rowCount,
      personalAccountsEnsured: ensuredAccounts.size,
      membershipsUpserted: memberships.rowCount,
      categoryUpdates,
      budgetUpdates,
      bankUpdates,
      paymentMethodUpdates,
      expenseUpdates,
      incomeUpdates
    });
  } catch (error) {
    await pool.query('rollback');
    throw error;
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  logger.error('Financial account backfill failed.', {
    error: error instanceof Error ? error.message : String(error)
  });
  process.exitCode = 1;
});
