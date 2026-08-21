-- Account-scoped copies of tenant defaults are legacy data. Reuse the tenant copy,
-- update every reference, and keep any unmatched row as a user custom category.
create temporary table scoped_default_category_map (
  source_id uuid primary key,
  target_id uuid not null
) on commit drop;

insert into scoped_default_category_map (source_id, target_id)
select duplicate.id, target.id
from categories duplicate
join categories target
  on target.tenant_id = duplicate.tenant_id
 and target.financial_account_id is null
 and target.is_default = true
 and target.parent_id is null
 and lower(target.name) = lower(duplicate.name)
where duplicate.is_default = true
  and duplicate.financial_account_id is not null
  and duplicate.parent_id is null;

insert into scoped_default_category_map (source_id, target_id)
select duplicate.id, target.id
from categories duplicate
join categories duplicate_parent on duplicate_parent.id = duplicate.parent_id
join categories target_parent
  on target_parent.tenant_id = duplicate.tenant_id
 and target_parent.financial_account_id is null
 and target_parent.is_default = true
 and target_parent.parent_id is null
 and lower(target_parent.name) = lower(duplicate_parent.name)
join categories target
  on target.tenant_id = duplicate.tenant_id
 and target.financial_account_id is null
 and target.is_default = true
 and target.parent_id = target_parent.id
 and lower(target.name) = lower(duplicate.name)
where duplicate.is_default = true
  and duplicate.financial_account_id is not null
  and duplicate.parent_id is not null
on conflict (source_id) do nothing;

update expenses expense
set category_id = category_map.target_id
from scoped_default_category_map category_map
where expense.category_id = category_map.source_id;

update expenses expense
set subcategory_id = category_map.target_id
from scoped_default_category_map category_map
where expense.subcategory_id = category_map.source_id;

update monthly_budgets budget
set category_id = category_map.target_id
from scoped_default_category_map category_map
where budget.category_id = category_map.source_id;

update monthly_budgets budget
set subcategory_id = category_map.target_id
from scoped_default_category_map category_map
where budget.subcategory_id = category_map.source_id;

update categories category
set parent_id = category_map.target_id
from scoped_default_category_map category_map
where category.parent_id = category_map.source_id
  and category.id not in (select source_id from scoped_default_category_map);

delete from categories category
using scoped_default_category_map category_map
where category.id = category_map.source_id;

update categories category
set is_default = false,
    updated_at = now()
where category.is_default = true
  and category.financial_account_id is not null;
