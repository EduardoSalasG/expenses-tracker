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

  insert into categories (tenant_id, name, is_default)
  values
    (v_system_tenant_id, 'Food', true),
    (v_system_tenant_id, 'Transport', true),
    (v_system_tenant_id, 'Housing', true),
    (v_system_tenant_id, 'Health', true),
    (v_system_tenant_id, 'Education', true),
    (v_system_tenant_id, 'Services', true),
    (v_system_tenant_id, 'Entertainment', true),
    (v_system_tenant_id, 'Other', true)
  on conflict (tenant_id, parent_key, name) do update
    set is_default = true,
        updated_at = now();

  insert into categories (tenant_id, name, parent_id, is_default)
  select v_system_tenant_id, blueprint.name, parent.id, true
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
   and parent.parent_id is null
   and parent.name = blueprint.parent_name
  on conflict (tenant_id, parent_key, name) do update
    set is_default = true,
        updated_at = now();

  delete from categories obsolete
  using categories parent
  where obsolete.tenant_id = v_system_tenant_id
    and obsolete.parent_id = parent.id
    and parent.tenant_id = v_system_tenant_id
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

  insert into categories (tenant_id, name, is_default)
  select p_tenant_id, source.name, true
  from categories source
  where source.tenant_id = v_system_tenant_id
    and source.parent_id is null
  on conflict (tenant_id, parent_key, name) do update
    set is_default = true,
        updated_at = now();

  insert into categories (tenant_id, name, parent_id, is_default)
  select p_tenant_id, child.name, parent_copy.id, true
  from categories child
  join categories parent_source
    on parent_source.id = child.parent_id
   and parent_source.tenant_id = v_system_tenant_id
  join categories parent_copy
    on parent_copy.tenant_id = p_tenant_id
   and parent_copy.parent_id is null
   and parent_copy.name = parent_source.name
  where child.tenant_id = v_system_tenant_id
  on conflict (tenant_id, parent_key, name) do update
    set is_default = true,
        updated_at = now();
end;
$$;

select ensure_system_default_categories();
