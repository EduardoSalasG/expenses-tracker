create or replace function ensure_system_default_categories()
returns uuid
language plpgsql
as $$
declare
  v_system_tenant_id constant uuid := '11111111-1111-1111-1111-111111111111'::uuid;
begin
  insert into tenants (id)
  values (v_system_tenant_id)
  on conflict (id) do nothing;

  insert into categories (tenant_id, financial_account_id, name, is_default)
  select v_system_tenant_id, null, category_name, true
  from (
    values
      ('Food'),
      ('Transport'),
      ('Housing'),
      ('Health'),
      ('Education'),
      ('Services'),
      ('Entertainment'),
      ('Other')
  ) as roots(category_name)
  where not exists (
    select 1
    from categories existing
    where existing.tenant_id = v_system_tenant_id
      and existing.financial_account_id is null
      and existing.parent_id is null
      and lower(existing.name) = lower(roots.category_name)
  );

  update categories
  set is_default = true,
      updated_at = now()
  where tenant_id = v_system_tenant_id
    and financial_account_id is null
    and parent_id is null;

  insert into categories (tenant_id, financial_account_id, name, parent_id, is_default)
  select v_system_tenant_id, null, blueprint.name, parent.id, true
  from (
    values
      ('Food', 'Groceries'),
      ('Food', 'Restaurants'),
      ('Transport', 'Public Transport'),
      ('Transport', 'Uber'),
      ('Housing', 'Rent'),
      ('Health', 'Appointments'),
      ('Health', 'Medicines'),
      ('Health', 'Procedures'),
      ('Health', 'Sports'),
      ('Education', 'Work'),
      ('Entertainment', 'Theater'),
      ('Services', 'Phone'),
      ('Other', 'Gifts')
  ) as blueprint(parent_name, name)
  join categories parent
    on parent.tenant_id = v_system_tenant_id
   and parent.financial_account_id is null
   and parent.parent_id is null
   and lower(parent.name) = lower(blueprint.parent_name)
  where not exists (
    select 1
    from categories existing
    where existing.tenant_id = v_system_tenant_id
      and existing.financial_account_id is null
      and existing.parent_id = parent.id
      and lower(existing.name) = lower(blueprint.name)
  );

  update categories child
  set is_default = true,
      updated_at = now()
  from categories parent
  where child.tenant_id = v_system_tenant_id
    and child.financial_account_id is null
    and child.parent_id = parent.id
    and parent.tenant_id = v_system_tenant_id
    and parent.financial_account_id is null
    and parent.parent_id is null;

  delete from categories obsolete
  using categories parent
  where obsolete.tenant_id = v_system_tenant_id
    and obsolete.financial_account_id is null
    and obsolete.parent_id = parent.id
    and parent.tenant_id = v_system_tenant_id
    and parent.financial_account_id is null
    and (
      (parent.name = 'Education' and obsolete.name = 'Dance')
      or (parent.name = 'Entertainment' and obsolete.name = 'Dance')
    );

  return v_system_tenant_id;
end;
$$;

create or replace function seed_default_categories(p_tenant_id uuid)
returns void
language plpgsql
as $$
declare
  v_system_tenant_id uuid;
begin
  v_system_tenant_id := ensure_system_default_categories();

  if p_tenant_id = v_system_tenant_id then
    return;
  end if;

  insert into categories (tenant_id, financial_account_id, name, is_default)
  select p_tenant_id, null, source.name, true
  from categories source
  where source.tenant_id = v_system_tenant_id
    and source.financial_account_id is null
    and source.parent_id is null
    and not exists (
      select 1
      from categories existing
      where existing.tenant_id = p_tenant_id
        and existing.financial_account_id is null
        and existing.parent_id is null
        and lower(existing.name) = lower(source.name)
    );

  update categories
  set is_default = true,
      updated_at = now()
  where tenant_id = p_tenant_id
    and financial_account_id is null
    and parent_id is null;

  insert into categories (tenant_id, financial_account_id, name, parent_id, is_default)
  select p_tenant_id, null, child.name, parent_copy.id, true
  from categories child
  join categories parent_source
    on parent_source.id = child.parent_id
   and parent_source.tenant_id = v_system_tenant_id
   and parent_source.financial_account_id is null
  join categories parent_copy
    on parent_copy.tenant_id = p_tenant_id
   and parent_copy.financial_account_id is null
   and parent_copy.parent_id is null
   and lower(parent_copy.name) = lower(parent_source.name)
  where child.tenant_id = v_system_tenant_id
    and child.financial_account_id is null
    and not exists (
      select 1
      from categories existing
      where existing.tenant_id = p_tenant_id
        and existing.financial_account_id is null
        and existing.parent_id = parent_copy.id
        and lower(existing.name) = lower(child.name)
    );

  update categories child
  set is_default = true,
      updated_at = now()
  from categories parent
  where child.tenant_id = p_tenant_id
    and child.financial_account_id is null
    and child.parent_id = parent.id
    and parent.tenant_id = p_tenant_id
    and parent.financial_account_id is null
    and parent.parent_id is null;
end;
$$;

select ensure_system_default_categories();
