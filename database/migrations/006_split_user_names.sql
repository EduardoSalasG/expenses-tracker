alter table users
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists preferred_name text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_name = 'users' and column_name = 'name'
  ) then
    update users
    set first_name = coalesce(nullif(split_part(name, ' ', 1), ''), name, 'User'),
        last_name = coalesce(nullif(trim(substr(name, length(split_part(name, ' ', 1)) + 1)), ''), ''),
        preferred_name = coalesce(nullif(split_part(name, ' ', 1), ''), name, 'User')
    where first_name is null or last_name is null or preferred_name is null;
  else
    update users
    set first_name = coalesce(first_name, 'User'),
        last_name = coalesce(last_name, ''),
        preferred_name = coalesce(preferred_name, first_name, 'User')
    where first_name is null or last_name is null or preferred_name is null;
  end if;
end;
$$;

alter table users
  alter column first_name set not null,
  alter column last_name set not null,
  alter column preferred_name set not null;

alter table users
  drop column if exists name;

create or replace function upsert_user_by_phone(
  p_phone_number text,
  p_first_name text,
  p_last_name text,
  p_preferred_name text,
  p_email text,
  p_country_of_residence text,
  p_preferred_currency char(3)
) returns users
language plpgsql
as $$
declare
  v_tenant_id uuid;
  v_user users;
begin
  select tenant_id into v_tenant_id from users where phone_number = p_phone_number;

  if v_tenant_id is null then
    insert into tenants default values returning id into v_tenant_id;
  end if;

  insert into users (
    tenant_id,
    phone_number,
    first_name,
    last_name,
    preferred_name,
    email,
    country_of_residence,
    preferred_currency
  )
  values (
    v_tenant_id,
    p_phone_number,
    p_first_name,
    p_last_name,
    p_preferred_name,
    p_email,
    p_country_of_residence,
    p_preferred_currency
  )
  on conflict (phone_number) do update set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    preferred_name = excluded.preferred_name,
    email = excluded.email,
    country_of_residence = excluded.country_of_residence,
    preferred_currency = excluded.preferred_currency,
    updated_at = now()
  returning * into v_user;

  return v_user;
end;
$$;
