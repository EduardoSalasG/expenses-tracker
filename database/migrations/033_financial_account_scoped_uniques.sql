alter table categories
  drop constraint if exists categories_tenant_id_parent_key_name_key;

drop index if exists bank_options_tenant_name_uidx;
drop index if exists payment_method_options_tenant_name_uidx;

create unique index if not exists categories_tenant_account_parent_name_uidx
  on categories (
    tenant_id,
    coalesce(financial_account_id, '00000000-0000-0000-0000-000000000000'::uuid),
    parent_key,
    lower(name)
  );

create unique index if not exists bank_options_tenant_account_name_uidx
  on bank_options (
    coalesce(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(financial_account_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(name)
  );

create unique index if not exists payment_method_options_tenant_account_name_uidx
  on payment_method_options (
    coalesce(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(financial_account_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(name)
  );
