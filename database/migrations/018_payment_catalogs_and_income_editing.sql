create table if not exists bank_options (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists bank_options_tenant_name_uidx
  on bank_options ((coalesce(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid)), lower(name));

create table if not exists payment_method_options (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  code text not null,
  name text not null,
  kind text not null check (kind in ('cash', 'card', 'transfer')),
  card_type text check (card_type in ('credit', 'debit')),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (kind = 'card' or card_type is null)
);

create unique index if not exists payment_method_options_tenant_name_uidx
  on payment_method_options ((coalesce(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid)), lower(name));

alter table expenses
  add column if not exists payment_method_option_id uuid references payment_method_options(id),
  add column if not exists bank_option_id uuid references bank_options(id);

insert into bank_options (tenant_id, name, is_default)
values
  (null, 'Banco de Chile', true),
  (null, 'Banco Internacional', true),
  (null, 'Scotiabank Chile', true),
  (null, 'Banco de Crédito e Inversiones', true),
  (null, 'Banco BICE', true),
  (null, 'Banco Santander-Chile', true),
  (null, 'Banco Itaú Chile', true),
  (null, 'Banco Falabella', true),
  (null, 'Banco Ripley', true),
  (null, 'Banco Consorcio', true),
  (null, 'Tanner Banco Digital', true),
  (null, 'Tenpo Bank Chile', true),
  (null, 'Banco del Estado de Chile', true)
on conflict ((coalesce(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid)), lower(name)) do nothing;

insert into payment_method_options (tenant_id, code, name, kind, card_type, is_default)
values
  (null, 'transfer', 'Transferencia', 'transfer', null, true),
  (null, 'debit_card', 'Tarjeta de débito', 'card', 'debit', true),
  (null, 'credit_card', 'Tarjeta de crédito', 'card', 'credit', true),
  (null, 'cash', 'Efectivo', 'cash', null, true)
on conflict ((coalesce(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid)), lower(name)) do nothing;

insert into bank_options (tenant_id, name, is_default)
select distinct e.tenant_id, trim(e.bank), false
from expenses e
where e.bank is not null
  and trim(e.bank) <> ''
  and not exists (
    select 1
    from bank_options bo
    where coalesce(bo.tenant_id, e.tenant_id) = e.tenant_id
      and lower(bo.name) = lower(trim(e.bank))
  )
on conflict ((coalesce(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid)), lower(name)) do nothing;

update expenses
set payment_method_option_id = (
  select pmo.id
  from payment_method_options pmo
  where pmo.tenant_id is null
    and (
      (expenses.payment_method_kind = 'cash' and pmo.code = 'cash')
      or (expenses.payment_method_kind = 'transfer' and pmo.code = 'transfer')
      or (expenses.payment_method_kind = 'card' and expenses.card_type = 'debit' and pmo.code = 'debit_card')
      or (expenses.payment_method_kind = 'card' and expenses.card_type = 'credit' and pmo.code = 'credit_card')
    )
  limit 1
)
where payment_method_option_id is null;

update expenses
set bank_option_id = (
  select bo.id
  from bank_options bo
  where (bo.tenant_id is null or bo.tenant_id = expenses.tenant_id)
    and lower(bo.name) = lower(trim(expenses.bank))
  order by bo.tenant_id nulls first
  limit 1
)
where bank is not null
  and trim(bank) <> ''
  and bank_option_id is null;
