create extension if not exists pgcrypto;

create table tenants (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  email text,
  phone_number text not null unique,
  name text not null,
  role text not null default 'consumer',
  country_of_residence text not null,
  preferred_currency char(3) not null,
  report_preferences text[] not null default array['monthly']::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_report_preferences_check check (report_preferences <@ array['daily', 'weekly', 'monthly', 'yearly']::text[]),
  constraint users_role_check check (role in ('consumer', 'admin'))
);

create table otp_codes (
  phone_number text primary key,
  code text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  parent_id uuid references categories(id) on delete cascade,
  parent_key uuid generated always as (coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid)) stored,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_parent_not_self check (id <> parent_id),
  unique (tenant_id, parent_key, name)
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  expense_date timestamptz not null,
  amount numeric(14, 2) not null check (amount > 0),
  currency char(3) not null,
  concept text not null,
  category_id uuid not null references categories(id),
  subcategory_id uuid references categories(id),
  payment_method_kind text not null check (payment_method_kind in ('cash', 'card')),
  bank text,
  card_type text check (card_type in ('credit', 'debit')),
  original_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expenses_card_details_check check (
    payment_method_kind = 'cash'
    or payment_method_kind = 'card'
  )
);

create table incomes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  income_date timestamptz not null,
  amount numeric(14, 2) not null check (amount > 0),
  currency char(3) not null,
  concept text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table monthly_budgets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  budget_month date not null,
  category_id uuid not null references categories(id),
  subcategory_id uuid references categories(id),
  subcategory_key uuid generated always as (coalesce(subcategory_id, '00000000-0000-0000-0000-000000000000'::uuid)) stored,
  amount numeric(14, 2) not null check (amount > 0),
  currency char(3) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint monthly_budgets_month_start_check check (budget_month = date_trunc('month', budget_month)::date),
  unique (tenant_id, budget_month, category_id, subcategory_key)
);

create table whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  provider_message_id text,
  tenant_id uuid references tenants(id) on delete set null,
  user_id uuid references users(id) on delete set null,
  from_phone_number text not null,
  message text not null,
  parsing_status text not null check (parsing_status in ('processing', 'saved', 'needs_confirmation', 'unknown_user', 'failed')),
  expense_id uuid references expenses(id) on delete set null,
  created_at timestamptz not null default now()
);

create index users_phone_number_idx on users (phone_number);
create index users_report_preferences_gin_idx on users using gin (report_preferences);
create index categories_tenant_parent_idx on categories (tenant_id, parent_id);
create index expenses_tenant_date_idx on expenses (tenant_id, expense_date desc);
create index expenses_tenant_category_date_idx on expenses (tenant_id, category_id, subcategory_id, expense_date desc);
create index incomes_tenant_date_idx on incomes (tenant_id, income_date desc);
create index monthly_budgets_tenant_month_idx on monthly_budgets (tenant_id, budget_month);
create index whatsapp_messages_phone_created_idx on whatsapp_messages (from_phone_number, created_at desc);
create unique index whatsapp_messages_provider_message_id_uidx on whatsapp_messages (provider_message_id) where provider_message_id is not null;

create or replace function upsert_user_by_phone(
  p_phone_number text,
  p_name text,
  p_email text,
  p_country_of_residence text,
  p_preferred_currency char(3)
) returns users
language plpgsql
as $$
declare
  v_tenant_id uuid;
  v_user users;
begin
  select tenant_id into v_tenant_id from users where phone_number = p_phone_number;

  if v_tenant_id is null then
    insert into tenants default values returning id into v_tenant_id;
  end if;

  insert into users (tenant_id, phone_number, name, email, country_of_residence, preferred_currency)
  values (v_tenant_id, p_phone_number, p_name, p_email, p_country_of_residence, p_preferred_currency)
  on conflict (phone_number) do update set
    name = excluded.name,
    email = excluded.email,
    country_of_residence = excluded.country_of_residence,
    preferred_currency = excluded.preferred_currency,
    updated_at = now()
  returning * into v_user;

  return v_user;
end;
$$;

create or replace function seed_default_categories(p_tenant_id uuid)
returns void
language plpgsql
as $$
begin
  insert into categories (tenant_id, name, is_default)
  values
    (p_tenant_id, 'Food', true),
    (p_tenant_id, 'Transport', true),
    (p_tenant_id, 'Housing', true),
    (p_tenant_id, 'Health', true),
    (p_tenant_id, 'Entertainment', true),
    (p_tenant_id, 'Other', true)
  on conflict (tenant_id, parent_key, name) do nothing;
end;
$$;

create or replace function report_totals_by_currency(
  p_tenant_id uuid,
  p_from timestamptz,
  p_to timestamptz
) returns table (
  currency char(3),
  expense_total numeric,
  income_total numeric
)
language sql
stable
as $$
  with expense_totals as (
    select currency, sum(amount) as total
    from expenses
    where tenant_id = p_tenant_id and expense_date >= p_from and expense_date <= p_to
    group by currency
  ),
  income_totals as (
    select currency, sum(amount) as total
    from incomes
    where tenant_id = p_tenant_id and income_date >= p_from and income_date <= p_to
    group by currency
  )
  select
    coalesce(e.currency, i.currency) as currency,
    coalesce(e.total, 0) as expense_total,
    coalesce(i.total, 0) as income_total
  from expense_totals e
  full outer join income_totals i on i.currency = e.currency;
$$;
