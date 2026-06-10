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
    and coalesce(e.installment_count, 1) > 1
    and i.due_date >= r.month_start
    and i.due_date < r.month_end
  group by to_char(date_trunc('month', i.due_date at time zone 'utc'), 'YYYY-MM'), e.currency
  order by period_key, e.currency;
$$;
