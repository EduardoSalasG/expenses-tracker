create table if not exists financial_account_category_preferences (
  id uuid primary key default gen_random_uuid(),
  financial_account_id uuid not null references financial_accounts(id) on delete cascade,
  signal text not null check (length(trim(signal)) > 0),
  category_id uuid not null references categories(id) on delete cascade,
  subcategory_id uuid references categories(id) on delete cascade,
  source text not null check (source in ('explicit_correction', 'historical_consensus')),
  evidence_count integer not null check (evidence_count > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists financial_account_category_preferences_account_signal_uidx
  on financial_account_category_preferences (financial_account_id, signal);
create index if not exists financial_account_category_preferences_account_category_idx
  on financial_account_category_preferences (financial_account_id, category_id, subcategory_id);

create table if not exists financial_account_category_preference_evidence (
  id uuid primary key default gen_random_uuid(),
  financial_account_id uuid not null references financial_accounts(id) on delete cascade,
  signal text not null check (length(trim(signal)) > 0),
  category_id uuid not null references categories(id) on delete cascade,
  subcategory_id uuid references categories(id) on delete cascade,
  evidence_count integer not null check (evidence_count > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists financial_account_category_preference_evidence_selection_uidx
  on financial_account_category_preference_evidence (
    financial_account_id, signal, category_id,
    coalesce(subcategory_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );
create index if not exists financial_account_category_preference_evidence_account_signal_idx
  on financial_account_category_preference_evidence (financial_account_id, signal);
