alter table expenses
  add column if not exists purchase_date timestamptz,
  add column if not exists installment_count int not null default 1,
  add column if not exists first_installment_date timestamptz;

update expenses
set purchase_date = coalesce(purchase_date, expense_date),
    first_installment_date = coalesce(first_installment_date, expense_date),
    installment_count = coalesce(installment_count, 1);

create table if not exists expense_installments (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references expenses(id) on delete cascade,
  installment_number int not null check (installment_number >= 1),
  installment_count int not null check (installment_count >= 1),
  due_date timestamptz not null,
  amount numeric(14, 2) not null check (amount > 0),
  status text not null default 'scheduled',
  created_at timestamptz not null default now(),
  unique (expense_id, installment_number)
);

create index if not exists expense_installments_expense_id_idx on expense_installments (expense_id);
create index if not exists expense_installments_due_date_idx on expense_installments (due_date);
create index if not exists expense_installments_due_date_expense_id_idx on expense_installments (due_date, expense_id);

insert into expense_installments (expense_id, installment_number, installment_count, due_date, amount)
select
  e.id,
  1,
  coalesce(e.installment_count, 1),
  coalesce(e.first_installment_date, e.expense_date),
  e.amount
from expenses e
where not exists (
  select 1
  from expense_installments i
  where i.expense_id = e.id
);

create or replace function yearly_expenses_monthly_totals_by_tenant(
  p_tenant_id uuid,
  p_year int
) returns table (
  period_key text,
  currency char(3),
  total numeric
)
language sql
stable
as $$
  select
    to_char(date_trunc('month', i.due_date at time zone 'utc'), 'YYYY-MM') as period_key,
    e.currency,
    sum(i.amount) as total
  from expenses e
  join expense_installments i on i.expense_id = e.id
  where e.tenant_id = p_tenant_id
    and i.due_date >= make_timestamptz(p_year, 1, 1, 0, 0, 0, 'UTC')
    and i.due_date < make_timestamptz(p_year + 1, 1, 1, 0, 0, 0, 'UTC')
  group by 1, 2
  order by 1, 2;
$$;

create or replace function monthly_expenses_daily_totals_by_tenant(
  p_tenant_id uuid,
  p_month date
) returns table (
  period_key text,
  currency char(3),
  total numeric
)
language sql
stable
as $$
  with range as (
    select
      date_trunc('month', p_month)::timestamptz as month_start,
      (date_trunc('month', p_month) + interval '1 month')::timestamptz as month_end
  )
  select
    to_char((i.due_date at time zone 'utc')::date, 'YYYY-MM-DD') as period_key,
    e.currency,
    sum(i.amount) as total
  from expenses e
  join expense_installments i on i.expense_id = e.id
  cross join range r
  where e.tenant_id = p_tenant_id
    and i.due_date >= r.month_start
    and i.due_date < r.month_end
  group by 1, 2
  order by 1, 2;
$$;

create or replace function weekly_expenses_daily_totals_by_tenant(
  p_tenant_id uuid,
  p_week_start date
) returns table (
  period_key text,
  currency char(3),
  total numeric
)
language sql
stable
as $$
  with range as (
    select
      p_week_start::timestamptz as week_start,
      (p_week_start::timestamptz + interval '7 days') as week_end
  )
  select
    to_char((i.due_date at time zone 'utc')::date, 'YYYY-MM-DD') as period_key,
    e.currency,
    sum(i.amount) as total
  from expenses e
  join expense_installments i on i.expense_id = e.id
  cross join range r
  where e.tenant_id = p_tenant_id
    and i.due_date >= r.week_start
    and i.due_date < r.week_end
  group by 1, 2
  order by 1, 2;
$$;

create or replace function period_expense_category_totals_by_tenant(
  p_tenant_id uuid,
  p_from timestamptz,
  p_to timestamptz
) returns table (
  category_id uuid,
  subcategory_id uuid,
  currency char(3),
  total numeric
)
language sql
stable
as $$
  select
    e.category_id,
    e.subcategory_id,
    e.currency,
    sum(i.amount) as total
  from expenses e
  join expense_installments i on i.expense_id = e.id
  where e.tenant_id = p_tenant_id
    and i.due_date >= p_from
    and i.due_date <= p_to
  group by e.category_id, e.subcategory_id, e.currency
  order by e.category_id, e.subcategory_id, e.currency;
$$;

create or replace function upcoming_expense_installments_monthly_totals_by_tenant(
  p_tenant_id uuid,
  p_start_month date,
  p_months int default 6
) returns table (
  period_key text,
  currency char(3),
  total numeric
)
language sql
stable
as $$
  with range as (
    select
      date_trunc('month', p_start_month)::timestamptz as month_start,
      (date_trunc('month', p_start_month) + make_interval(months => greatest(p_months, 1)))::timestamptz as month_end
  )
  select
    to_char(date_trunc('month', i.due_date at time zone 'utc'), 'YYYY-MM') as period_key,
    e.currency,
    sum(i.amount) as total
  from expenses e
  join expense_installments i on i.expense_id = e.id
  cross join range r
  where e.tenant_id = p_tenant_id
    and i.due_date >= r.month_start
    and i.due_date < r.month_end
  group by 1, 2
  order by 1, 2;
$$;
