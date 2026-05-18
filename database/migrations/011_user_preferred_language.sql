alter table users
  add column if not exists preferred_language text not null default 'es';

alter table users
  drop constraint if exists users_preferred_language_check;

alter table users
  add constraint users_preferred_language_check
  check (preferred_language in ('es', 'en'));

create or replace function upsert_user_by_phone(
  p_phone_number text,
  p_first_name text,
  p_last_name text,
  p_preferred_name text,
  p_email text,
  p_country_of_residence text,
  p_preferred_currency char(3),
  p_preferred_language text default 'es'
)
returns users
language plpgsql
as $$
declare
  v_tenant_id uuid;
  v_row users;
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
    preferred_currency,
    preferred_language
  )
  values (
    v_tenant_id,
    p_phone_number,
    p_first_name,
    p_last_name,
    p_preferred_name,
    p_email,
    p_country_of_residence,
    p_preferred_currency,
    coalesce(nullif(p_preferred_language, ''), 'es')
  )
  on conflict (phone_number) do update
  set first_name = excluded.first_name,
      last_name = excluded.last_name,
      preferred_name = excluded.preferred_name,
      email = excluded.email,
      country_of_residence = excluded.country_of_residence,
      preferred_currency = excluded.preferred_currency,
      preferred_language = coalesce(nullif(excluded.preferred_language, ''), users.preferred_language),
      updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;
