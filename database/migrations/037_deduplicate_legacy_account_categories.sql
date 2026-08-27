-- Earlier catalog migrations could leave account-scoped copies of canonical
-- system categories marked as custom. Repoint financial history to the system
-- catalog and retain any category that does not exactly match a base entry.
select ensure_system_default_categories();

create temporary table account_legacy_category_map (
  source_id uuid primary key,
  target_id uuid not null
) on commit drop;

insert into account_legacy_category_map (source_id, target_id)
select distinct on (legacy.id)
  legacy.id,
  system_default.id
from categories legacy
join categories system_default
  on system_default.tenant_id = '11111111-1111-1111-1111-111111111111'::uuid
 and system_default.financial_account_id is null
 and system_default.parent_id is null
 and lower(system_default.name) = lower(legacy.name)
where legacy.tenant_id <> '11111111-1111-1111-1111-111111111111'::uuid
  and legacy.parent_id is null
order by legacy.id, system_default.created_at, system_default.id;

insert into account_legacy_category_map (source_id, target_id)
select distinct on (legacy_child.id)
  legacy_child.id,
  system_child.id
from categories legacy_child
join categories legacy_parent on legacy_parent.id = legacy_child.parent_id
join categories system_parent
  on system_parent.tenant_id = '11111111-1111-1111-1111-111111111111'::uuid
 and system_parent.financial_account_id is null
 and system_parent.parent_id is null
 and lower(system_parent.name) = lower(legacy_parent.name)
join categories system_child
  on system_child.tenant_id = '11111111-1111-1111-1111-111111111111'::uuid
 and system_child.financial_account_id is null
 and system_child.parent_id = system_parent.id
 and lower(system_child.name) = lower(legacy_child.name)
where legacy_child.tenant_id <> '11111111-1111-1111-1111-111111111111'::uuid
order by legacy_child.id, system_child.created_at, system_child.id
on conflict (source_id) do nothing;

-- Normalize budget references as a set before updating them. This avoids a
-- unique-key conflict when an old copied category and its system equivalent
-- already have a permanent budget in the same financial account.
create temporary table normalized_budget_rows on commit drop as
select
  budget.id,
  coalesce(category_map.target_id, budget.category_id) as category_id,
  coalesce(subcategory_map.target_id, budget.subcategory_id) as subcategory_id,
  row_number() over (
    partition by
      budget.tenant_id,
      budget.financial_account_id,
      budget.budget_month,
      coalesce(category_map.target_id, budget.category_id),
      coalesce(subcategory_map.target_id, budget.subcategory_id, '00000000-0000-0000-0000-000000000000'::uuid)
    order by budget.updated_at desc, budget.created_at desc, budget.id desc
  ) as row_rank
from monthly_budgets budget
left join account_legacy_category_map category_map on category_map.source_id = budget.category_id
left join account_legacy_category_map subcategory_map on subcategory_map.source_id = budget.subcategory_id
where category_map.source_id is not null
   or subcategory_map.source_id is not null;

delete from monthly_budgets budget
using normalized_budget_rows normalized
where budget.id = normalized.id
  and normalized.row_rank > 1;

update monthly_budgets budget
set category_id = normalized.category_id,
    subcategory_id = normalized.subcategory_id,
    updated_at = now()
from normalized_budget_rows normalized
where budget.id = normalized.id
  and normalized.row_rank = 1;

update expenses expense
set category_id = category_map.target_id
from account_legacy_category_map category_map
where expense.category_id = category_map.source_id;

update expenses expense
set subcategory_id = category_map.target_id
from account_legacy_category_map category_map
where expense.subcategory_id = category_map.source_id;

-- A mapped child must be detached from its legacy parent before deleting it.
update categories category
set parent_id = parent_map.target_id,
    updated_at = now()
from account_legacy_category_map parent_map
where category.parent_id = parent_map.source_id;

delete from categories category
using account_legacy_category_map category_map
where category.id = category_map.source_id;
