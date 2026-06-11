# Database Query Analysis

This project uses direct parameterized SQL for simple reads/writes and PostgreSQL functions for multi-step transactional or aggregation-heavy behavior.

## Current Decisions

- `upsert_user_by_phone`: PostgreSQL function.
  - Reason: user creation must atomically create or reuse a tenant and upsert the phone identity.
  - Indexes: `users_phone_number_idx` plus `users.phone_number unique`.

- `seed_default_categories`: PostgreSQL function.
  - Reason: default category tree seeding is idempotent and tenant-scoped, including root categories and subcategories used by messaging-based category assignment.
  - Indexes: `categories_tenant_parent_idx` and generated `parent_key` uniqueness so root categories do not duplicate.

- Expense and income inserts: direct SQL.
  - Reason: single-table writes with application-level validation.

- Chat-based expense and income corrections: direct SQL.
  - Query shape: read recent tenant-scoped movements, match the referenced movement in application code, then update one row by `(tenant_id, id)`.
  - Reason: matching uses interpreted natural language and category labels, so the decision belongs in the application layer. The final update is a single-table tenant-scoped write.
  - Indexes: `expenses_tenant_date_idx` and `incomes_tenant_date_idx` for recent candidate reads; primary keys plus `tenant_id` predicate for row updates.

- Recent expenses: direct SQL.
  - Query shape: `where tenant_id = $1 order by expense_date desc limit $2`.
  - Index: `expenses_tenant_date_idx`.

- Filtered expenses: direct SQL.
  - Query shape: tenant-scoped optional filters for date range, category, currency, and payment method, ordered by `expense_date desc`.
  - Reason: this is a straightforward read for the history screen; direct parameterized SQL keeps it visible and easy to tune.
  - Indexes: `expenses_tenant_date_idx` for date-ordered tenant history and `expenses_tenant_category_date_idx` when category filtering is selective.

- Messaging message idempotency: direct SQL reservation.
  - Query shape: insert `channel` and `provider_message_id` into `messaging_messages` before expense creation.
  - Reason: a unique partial index lets PostgreSQL atomically reject provider webhook retries before duplicate expenses are created.
  - Index: `messaging_messages_provider_message_id_uidx` on `(channel, provider_message_id)`.

- Messaging pending drafts: direct SQL upsert/read/delete.
  - Query shape: one active `messaging_pending_drafts` row by `tenant_id`, `user_id`, `channel`, and `expires_at`.
  - Reason: the draft is a simple per-user conversational state record; direct SQL keeps expiration and overwrite behavior visible.
  - Index: `messaging_pending_drafts_active_idx` plus unique `(tenant_id, user_id, channel)`.

- Reports: application orchestrates period reads for MVP; `report_totals_by_currency` is available for database-side aggregation.
  - Query shape: tenant and date range over expenses/incomes.
  - Indexes: `expenses_tenant_date_idx`, `incomes_tenant_date_idx`.

- Aggregated report series (database functions):
  - `yearly_expenses_monthly_totals_by_tenant(tenant_id, year)`
  - `monthly_expenses_daily_totals_by_tenant(tenant_id, month)`
  - `weekly_expenses_daily_totals_by_tenant(tenant_id, week_start)`
  - `yearly_incomes_monthly_totals_by_tenant(tenant_id, year)`
  - `monthly_incomes_daily_totals_by_tenant(tenant_id, month)`
  - `period_expense_category_totals_by_tenant(tenant_id, from, to)`
  - Reason: these are aggregation-heavy dashboard/report workloads where database-side grouping reduces payload size, keeps period bucketing consistent, and avoids duplicate aggregation logic in multiple clients.
  - Indexes used: `expenses_tenant_date_idx`, `expenses_tenant_category_date_idx`, `incomes_tenant_date_idx`.

- Filtered incomes: direct SQL.
  - Query shape: tenant-scoped optional filters for date range and currency, ordered by `income_date desc`.
  - Reason: this is a straightforward read for the income history screen.
  - Index: `incomes_tenant_date_idx`.

- Monthly budget planner: direct SQL plus application composition.
  - Query shape: `monthly_budgets` by tenant/month plus monthly report reads over expenses.
  - Reason: budget rows are simple tenant/month reads, while spending progress is composed in the frontend from existing monthly report data to avoid a premature specialized aggregate endpoint.
  - Indexes: `monthly_budgets_tenant_month_idx`, `expenses_tenant_date_idx`.

- Due report delivery recipients: direct SQL.
  - Query shape: users whose `report_preferences` array contains a selected frequency.
  - Reason: simple recipient discovery before per-tenant report generation and Telegram delivery.
  - Index: `users_report_preferences_gin_idx`.

- Report dispatch idempotency: direct SQL reservation/update.
  - Query shape: reserve `(channel, frequency, period_from, period_to, user_id)` as `pending`, then mark `sent` or `failed`.
  - Reason: scheduled jobs can run more than once; reservation avoids duplicate delivery while preserving retry visibility.
  - Index: `report_dispatches_unique_active_idx` partial unique index and `report_dispatches_tenant_period_idx`.

- User profile reads and session refresh: direct SQL.
  - Query shape: `users` by primary key for `GET /me` and `POST /auth/refresh`.
  - Reason: single-row identity lookup is simple, stable, and already backed by the primary key.
  - Index: `users_pkey`.

- User profile updates: direct SQL.
  - Query shape: update `first_name`, `last_name`, `preferred_name`, `email`, `country_of_residence`, and `preferred_currency` by authenticated user id.
  - Reason: single-row update with no cross-table transactional behavior.
  - Index: `users_pkey`.

## Required Analysis Command

Run this before changing dashboard/report queries:

```sql
explain (analyze, buffers)
select *
from expenses
where tenant_id = '<tenant-id>'
order by expense_date desc
limit 10;
```

For report aggregation:

```sql
explain (analyze, buffers)
select *
from report_totals_by_currency('<tenant-id>', now() - interval '30 days', now());
```

Document the observed plan, whether indexes are used, and why direct SQL or a function/procedure remains the right choice.
