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
    to_char(date_trunc('month', expense_date at time zone 'utc'), 'YYYY-MM') as period_key,
    currency,
    sum(amount) as total
  from expenses
  where tenant_id = p_tenant_id
    and expense_date >= make_timestamptz(p_year, 1, 1, 0, 0, 0, 'UTC')
    and expense_date < make_timestamptz(p_year + 1, 1, 1, 0, 0, 0, 'UTC')
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
    to_char((expense_date at time zone 'utc')::date, 'YYYY-MM-DD') as period_key,
    e.currency,
    sum(e.amount) as total
  from expenses e
  cross join range r
  where e.tenant_id = p_tenant_id
    and e.expense_date >= r.month_start
    and e.expense_date < r.month_end
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
    to_char((expense_date at time zone 'utc')::date, 'YYYY-MM-DD') as period_key,
    e.currency,
    sum(e.amount) as total
  from expenses e
  cross join range r
  where e.tenant_id = p_tenant_id
    and e.expense_date >= r.week_start
    and e.expense_date < r.week_end
  group by 1, 2
  order by 1, 2;
$$;

create or replace function yearly_incomes_monthly_totals_by_tenant(
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
    to_char(date_trunc('month', income_date at time zone 'utc'), 'YYYY-MM') as period_key,
    currency,
    sum(amount) as total
  from incomes
  where tenant_id = p_tenant_id
    and income_date >= make_timestamptz(p_year, 1, 1, 0, 0, 0, 'UTC')
    and income_date < make_timestamptz(p_year + 1, 1, 1, 0, 0, 0, 'UTC')
  group by 1, 2
  order by 1, 2;
$$;

create or replace function monthly_incomes_daily_totals_by_tenant(
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
    to_char((income_date at time zone 'utc')::date, 'YYYY-MM-DD') as period_key,
    i.currency,
    sum(i.amount) as total
  from incomes i
  cross join range r
  where i.tenant_id = p_tenant_id
    and i.income_date >= r.month_start
    and i.income_date < r.month_end
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
    sum(e.amount) as total
  from expenses e
  where e.tenant_id = p_tenant_id
    and e.expense_date >= p_from
    and e.expense_date <= p_to
  group by e.category_id, e.subcategory_id, e.currency
  order by e.category_id, e.subcategory_id, e.currency;
$$;
