-- Budgets are permanent templates repeated every month.
-- Keep only the latest budget per (tenant, category, subcategory) and pin month to a fixed anchor.

with latest as (
  select distinct on (tenant_id, category_id, subcategory_key)
    tenant_id,
    category_id,
    subcategory_id,
    amount,
    currency,
    created_at,
    updated_at
  from monthly_budgets
  order by tenant_id, category_id, subcategory_key, updated_at desc, created_at desc
),
deleted as (
  delete from monthly_budgets
)
insert into monthly_budgets (tenant_id, budget_month, category_id, subcategory_id, amount, currency, created_at, updated_at)
select tenant_id, date '2000-01-01', category_id, subcategory_id, amount, currency, created_at, updated_at
from latest;
