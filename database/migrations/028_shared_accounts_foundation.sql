create table if not exists financial_accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  type text not null check (type in ('personal', 'shared')),
  name text not null,
  currency char(3) not null,
  created_by_user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists financial_accounts_one_personal_per_user_uidx
  on financial_accounts (created_by_user_id)
  where type = 'personal';

create index if not exists financial_accounts_tenant_type_idx
  on financial_accounts (tenant_id, type, created_at desc);

create table if not exists financial_account_members (
  id uuid primary key default gen_random_uuid(),
  financial_account_id uuid not null references financial_accounts(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  status text not null check (status in ('active', 'invited', 'removed')),
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (financial_account_id, user_id)
);

create index if not exists financial_account_members_user_status_idx
  on financial_account_members (user_id, status, financial_account_id);

create table if not exists financial_account_invitations (
  id uuid primary key default gen_random_uuid(),
  financial_account_id uuid not null references financial_accounts(id) on delete cascade,
  invited_by_user_id uuid references users(id) on delete set null,
  email text not null,
  phone_number text,
  token text not null unique,
  status text not null check (status in ('pending', 'accepted', 'expired', 'revoked')),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists financial_account_invitations_account_status_idx
  on financial_account_invitations (financial_account_id, status, expires_at desc);

create table if not exists messaging_channel_contexts (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('whatsapp', 'telegram')),
  provider_user_id text not null,
  user_id uuid not null references users(id) on delete cascade,
  financial_account_id uuid not null references financial_accounts(id) on delete cascade,
  updated_at timestamptz not null default now(),
  unique (channel, provider_user_id)
);

create index if not exists messaging_channel_contexts_user_idx
  on messaging_channel_contexts (user_id, updated_at desc);

alter table expenses
  add column if not exists financial_account_id uuid references financial_accounts(id),
  add column if not exists created_by_user_id uuid references users(id),
  add column if not exists paid_by_user_id uuid references users(id);

alter table incomes
  add column if not exists financial_account_id uuid references financial_accounts(id);

alter table monthly_budgets
  add column if not exists financial_account_id uuid references financial_accounts(id);

alter table categories
  add column if not exists financial_account_id uuid references financial_accounts(id);

alter table bank_options
  add column if not exists financial_account_id uuid references financial_accounts(id);

alter table payment_method_options
  add column if not exists financial_account_id uuid references financial_accounts(id);

create index if not exists expenses_financial_account_date_idx
  on expenses (financial_account_id, expense_date desc);

create index if not exists incomes_financial_account_date_idx
  on incomes (financial_account_id, income_date desc);

create index if not exists monthly_budgets_financial_account_idx
  on monthly_budgets (financial_account_id, budget_month);

create index if not exists categories_financial_account_parent_idx
  on categories (financial_account_id, parent_id);

create index if not exists bank_options_financial_account_idx
  on bank_options (financial_account_id, lower(name));

create index if not exists payment_method_options_financial_account_idx
  on payment_method_options (financial_account_id, lower(name));

create or replace function ensure_personal_financial_account(p_user_id uuid)
returns uuid
language plpgsql
as $$
declare
  v_account_id uuid;
  v_tenant_id uuid;
  v_currency char(3);
begin
  select
    fa.id
  into v_account_id
  from financial_accounts fa
  where fa.created_by_user_id = p_user_id
    and fa.type = 'personal'
  limit 1;

  if v_account_id is not null then
    return v_account_id;
  end if;

  select
    u.tenant_id,
    u.preferred_currency
  into
    v_tenant_id,
    v_currency
  from users u
  where u.id = p_user_id;

  if v_tenant_id is null then
    raise exception 'Could not create personal financial account. User % not found.', p_user_id;
  end if;

  insert into financial_accounts (
    tenant_id,
    type,
    name,
    currency,
    created_by_user_id
  )
  values (
    v_tenant_id,
    'personal',
    'Personal',
    v_currency,
    p_user_id
  )
  returning id into v_account_id;

  return v_account_id;
end;
$$;
