create or replace function seed_default_categories(p_tenant_id uuid)
returns void
language plpgsql
as $$
begin
  insert into categories (tenant_id, name, is_default)
  values
    (p_tenant_id, 'Food', true),
    (p_tenant_id, 'Transport', true),
    (p_tenant_id, 'Housing', true),
    (p_tenant_id, 'Health', true),
    (p_tenant_id, 'Education', true),
    (p_tenant_id, 'Services', true),
    (p_tenant_id, 'Entertainment', true),
    (p_tenant_id, 'Other', true)
  on conflict (tenant_id, parent_key, name) do nothing;

  insert into categories (tenant_id, name, parent_id, is_default)
  select p_tenant_id, child.name, parent.id, true
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
      ('Education', 'Dance'),
      ('Education', 'Work'),
      ('Entertainment', 'Dance'),
      ('Entertainment', 'Theater'),
      ('Services', 'Phone'),
      ('Other', 'Gifts')
  ) as child(parent_name, name)
  join categories parent
    on parent.tenant_id = p_tenant_id
   and parent.parent_id is null
   and parent.name = child.parent_name
  on conflict (tenant_id, parent_key, name) do nothing;
end;
$$;
