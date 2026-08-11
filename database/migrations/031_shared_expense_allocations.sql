alter table expenses
  add column if not exists allocation_mode text
  check (allocation_mode in ('payer', 'equal', 'custom'));

create table if not exists expense_allocations (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references expenses(id) on delete cascade,
  financial_account_id uuid not null references financial_accounts(id) on delete cascade,
  owed_by_user_id uuid not null references users(id) on delete cascade,
  amount numeric(14,2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (expense_id, owed_by_user_id)
);

create index if not exists expense_allocations_financial_account_user_idx
  on expense_allocations (financial_account_id, owed_by_user_id);

create index if not exists expense_allocations_expense_idx
  on expense_allocations (expense_id);
