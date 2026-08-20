with duplicated_default_categories as (
  select
    c.id,
    c.tenant_id,
    c.financial_account_id,
    c.name,
    c.parent_id,
    c.is_default
  from categories c
  where c.is_default = true
    and c.financial_account_id is not null
),
tenant_default_roots as (
  select
    c.id,
    c.tenant_id,
    c.name
  from categories c
  where c.is_default = true
    and c.financial_account_id is null
    and c.parent_id is null
),
tenant_default_children as (
  select
    c.id,
    c.tenant_id,
    c.name,
    parent.name as parent_name
  from categories c
  join categories parent on parent.id = c.parent_id
  where c.is_default = true
    and c.financial_account_id is null
    and c.parent_id is not null
),
root_mapping as (
  select
    duplicate.id as duplicate_id,
    target.id as target_id
  from duplicated_default_categories duplicate
  join tenant_default_roots target
    on target.tenant_id = duplicate.tenant_id
   and lower(target.name) = lower(duplicate.name)
  where duplicate.parent_id is null
),
child_mapping as (
  select
    duplicate.id as duplicate_id,
    target.id as target_id
  from duplicated_default_categories duplicate
  join categories duplicate_parent on duplicate_parent.id = duplicate.parent_id
  join tenant_default_children target
    on target.tenant_id = duplicate.tenant_id
   and lower(target.name) = lower(duplicate.name)
   and lower(target.parent_name) = lower(duplicate_parent.name)
  where duplicate.parent_id is not null
),
all_mapping as (
  select * from root_mapping
  union all
  select * from child_mapping
)
update expenses e
set category_id = mapping.target_id
from all_mapping mapping
where e.category_id = mapping.duplicate_id;

with duplicated_default_categories as (
  select
    c.id,
    c.tenant_id,
    c.financial_account_id,
    c.name,
    c.parent_id,
    c.is_default
  from categories c
  where c.is_default = true
    and c.financial_account_id is not null
),
tenant_default_roots as (
  select
    c.id,
    c.tenant_id,
    c.name
  from categories c
  where c.is_default = true
    and c.financial_account_id is null
    and c.parent_id is null
),
tenant_default_children as (
  select
    c.id,
    c.tenant_id,
    c.name,
    parent.name as parent_name
  from categories c
  join categories parent on parent.id = c.parent_id
  where c.is_default = true
    and c.financial_account_id is null
    and c.parent_id is not null
),
root_mapping as (
  select
    duplicate.id as duplicate_id,
    target.id as target_id
  from duplicated_default_categories duplicate
  join tenant_default_roots target
    on target.tenant_id = duplicate.tenant_id
   and lower(target.name) = lower(duplicate.name)
  where duplicate.parent_id is null
),
child_mapping as (
  select
    duplicate.id as duplicate_id,
    target.id as target_id
  from duplicated_default_categories duplicate
  join categories duplicate_parent on duplicate_parent.id = duplicate.parent_id
  join tenant_default_children target
    on target.tenant_id = duplicate.tenant_id
   and lower(target.name) = lower(duplicate.name)
   and lower(target.parent_name) = lower(duplicate_parent.name)
  where duplicate.parent_id is not null
),
all_mapping as (
  select * from root_mapping
  union all
  select * from child_mapping
)
update expenses e
set subcategory_id = mapping.target_id
from all_mapping mapping
where e.subcategory_id = mapping.duplicate_id;

with duplicated_default_categories as (
  select
    c.id,
    c.tenant_id,
    c.financial_account_id,
    c.name,
    c.parent_id,
    c.is_default
  from categories c
  where c.is_default = true
    and c.financial_account_id is not null
),
tenant_default_roots as (
  select
    c.id,
    c.tenant_id,
    c.name
  from categories c
  where c.is_default = true
    and c.financial_account_id is null
    and c.parent_id is null
),
tenant_default_children as (
  select
    c.id,
    c.tenant_id,
    c.name,
    parent.name as parent_name
  from categories c
  join categories parent on parent.id = c.parent_id
  where c.is_default = true
    and c.financial_account_id is null
    and c.parent_id is not null
),
root_mapping as (
  select
    duplicate.id as duplicate_id,
    target.id as target_id
  from duplicated_default_categories duplicate
  join tenant_default_roots target
    on target.tenant_id = duplicate.tenant_id
   and lower(target.name) = lower(duplicate.name)
  where duplicate.parent_id is null
),
child_mapping as (
  select
    duplicate.id as duplicate_id,
    target.id as target_id
  from duplicated_default_categories duplicate
  join categories duplicate_parent on duplicate_parent.id = duplicate.parent_id
  join tenant_default_children target
    on target.tenant_id = duplicate.tenant_id
   and lower(target.name) = lower(duplicate.name)
   and lower(target.parent_name) = lower(duplicate_parent.name)
  where duplicate.parent_id is not null
),
all_mapping as (
  select * from root_mapping
  union all
  select * from child_mapping
)
update monthly_budgets b
set category_id = mapping.target_id
from all_mapping mapping
where b.category_id = mapping.duplicate_id;

with duplicated_default_categories as (
  select
    c.id,
    c.tenant_id,
    c.financial_account_id,
    c.name,
    c.parent_id,
    c.is_default
  from categories c
  where c.is_default = true
    and c.financial_account_id is not null
),
tenant_default_roots as (
  select
    c.id,
    c.tenant_id,
    c.name
  from categories c
  where c.is_default = true
    and c.financial_account_id is null
    and c.parent_id is null
),
tenant_default_children as (
  select
    c.id,
    c.tenant_id,
    c.name,
    parent.name as parent_name
  from categories c
  join categories parent on parent.id = c.parent_id
  where c.is_default = true
    and c.financial_account_id is null
    and c.parent_id is not null
),
root_mapping as (
  select
    duplicate.id as duplicate_id,
    target.id as target_id
  from duplicated_default_categories duplicate
  join tenant_default_roots target
    on target.tenant_id = duplicate.tenant_id
   and lower(target.name) = lower(duplicate.name)
  where duplicate.parent_id is null
),
child_mapping as (
  select
    duplicate.id as duplicate_id,
    target.id as target_id
  from duplicated_default_categories duplicate
  join categories duplicate_parent on duplicate_parent.id = duplicate.parent_id
  join tenant_default_children target
    on target.tenant_id = duplicate.tenant_id
   and lower(target.name) = lower(duplicate.name)
   and lower(target.parent_name) = lower(duplicate_parent.name)
  where duplicate.parent_id is not null
),
all_mapping as (
  select * from root_mapping
  union all
  select * from child_mapping
)
update monthly_budgets b
set subcategory_id = mapping.target_id
from all_mapping mapping
where b.subcategory_id = mapping.duplicate_id;

delete from categories
where is_default = true
  and financial_account_id is not null;
