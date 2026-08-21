-- Base categories belong to the system tenant. User-created catalog entries belong to one financial account.
-- Existing tenant-level defaults are mapped before they are removed so historic expenses and budgets remain valid.
select ensure_system_default_categories();

create temporary table legacy_default_category_map (
  source_id uuid primary key,
  target_id uuid not null
) on commit drop;

insert into legacy_default_category_map (source_id, target_id)
select legacy.id, system_default.id
from categories legacy
join categories system_default
  on system_default.tenant_id = '11111111-1111-1111-1111-111111111111'::uuid
 and system_default.financial_account_id is null
 and system_default.parent_id is null
 and lower(system_default.name) = lower(legacy.name)
where legacy.tenant_id <> '11111111-1111-1111-1111-111111111111'::uuid
  and legacy.financial_account_id is null
  and legacy.is_default = true
  and legacy.parent_id is null;

insert into legacy_default_category_map (source_id, target_id)
select legacy_child.id, system_child.id
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
  and legacy_child.financial_account_id is null
  and legacy_child.is_default = true
on conflict (source_id) do nothing;

update expenses expense
set category_id = category_map.target_id
from legacy_default_category_map category_map
where expense.category_id = category_map.source_id;

update expenses expense
set subcategory_id = category_map.target_id
from legacy_default_category_map category_map
where expense.subcategory_id = category_map.source_id;

update monthly_budgets budget
set category_id = category_map.target_id
from legacy_default_category_map category_map
where budget.category_id = category_map.source_id;

update monthly_budgets budget
set subcategory_id = category_map.target_id
from legacy_default_category_map category_map
where budget.subcategory_id = category_map.source_id;

-- Preserve a custom child that was attached to an old default parent.
update categories category
set parent_id = category_map.target_id
from legacy_default_category_map category_map
where category.parent_id = category_map.source_id
  and category.id not in (select source_id from legacy_default_category_map);

-- A legacy default that is no longer part of the canonical catalog becomes a personal custom category.
update categories category
set is_default = false,
    updated_at = now()
where category.tenant_id <> '11111111-1111-1111-1111-111111111111'::uuid
  and category.financial_account_id is null
  and category.is_default = true
  and category.id not in (select source_id from legacy_default_category_map);

delete from categories category
using legacy_default_category_map category_map
where category.id = category_map.source_id;

with personal_accounts as (
  select user_record.tenant_id, ensure_personal_financial_account(user_record.id) as financial_account_id
  from users user_record
)
update categories category
set financial_account_id = personal_accounts.financial_account_id,
    updated_at = now()
from personal_accounts
where category.tenant_id = personal_accounts.tenant_id
  and category.tenant_id <> '11111111-1111-1111-1111-111111111111'::uuid
  and category.financial_account_id is null
  and category.is_default = false;

with personal_accounts as (
  select user_record.tenant_id, ensure_personal_financial_account(user_record.id) as financial_account_id
  from users user_record
)
update bank_options bank
set financial_account_id = personal_accounts.financial_account_id,
    updated_at = now()
from personal_accounts
where bank.tenant_id = personal_accounts.tenant_id
  and bank.financial_account_id is null
  and bank.is_default = false;

with personal_accounts as (
  select user_record.tenant_id, ensure_personal_financial_account(user_record.id) as financial_account_id
  from users user_record
)
update payment_method_options payment_method
set financial_account_id = personal_accounts.financial_account_id,
    updated_at = now()
from personal_accounts
where payment_method.tenant_id = personal_accounts.tenant_id
  and payment_method.financial_account_id is null
  and payment_method.is_default = false;

create or replace function seed_default_categories(p_tenant_id uuid)
returns void
language plpgsql
as $$
begin
  perform p_tenant_id;
  perform ensure_system_default_categories();
end;
$$;
