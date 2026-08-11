create table if not exists financial_account_settlements (
  id uuid primary key default gen_random_uuid(),
  financial_account_id uuid not null references financial_accounts(id) on delete cascade,
  recorded_by_user_id uuid not null references users(id) on delete cascade,
  paid_by_user_id uuid not null references users(id) on delete cascade,
  received_by_user_id uuid not null references users(id) on delete cascade,
  currency char(3) not null,
  amount numeric(14,2) not null check (amount > 0),
  settled_at timestamptz not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (paid_by_user_id <> received_by_user_id)
);

create index if not exists financial_account_settlements_account_date_idx
  on financial_account_settlements (financial_account_id, settled_at desc, created_at desc);

create index if not exists financial_account_settlements_pair_idx
  on financial_account_settlements (financial_account_id, paid_by_user_id, received_by_user_id);
