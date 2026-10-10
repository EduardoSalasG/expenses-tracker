create table if not exists financial_account_category_preferences (
  id uuid primary key default gen_random_uuid(),
  financial_account_id uuid not null references financial_accounts(id) on delete cascade,
  signal text not null check (length(trim(signal)) > 0),
  category_id uuid not null references categories(id) on delete cascade,
  subcategory_id uuid references categories(id) on delete cascade,
  source text not null check (source in ('explicit_correction', 'historical_consensus')),
  evidence_count integer not null check (evidence_count > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists financial_account_category_preferences_account_signal_uidx
  on financial_account_category_preferences (financial_account_id, signal);
create index if not exists financial_account_category_preferences_account_category_idx
  on financial_account_category_preferences (financial_account_id, category_id, subcategory_id);

create table if not exists financial_account_category_preference_evidence (
  id uuid primary key default gen_random_uuid(),
  financial_account_id uuid not null references financial_accounts(id) on delete cascade,
  signal text not null check (length(trim(signal)) > 0),
  category_id uuid not null references categories(id) on delete cascade,
  subcategory_id uuid references categories(id) on delete cascade,
  evidence_count integer not null check (evidence_count > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists financial_account_category_preference_evidence_selection_uidx
  on financial_account_category_preference_evidence (
    financial_account_id, signal, category_id,
    coalesce(subcategory_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );
create index if not exists financial_account_category_preference_evidence_account_signal_idx
  on financial_account_category_preference_evidence (financial_account_id, signal);

create or replace function validate_financial_account_category_preference_selection()
returns trigger
language plpgsql
as $$
begin
  perform 1
  from financial_accounts account
  join categories root on root.id = new.category_id and root.parent_id is null
  left join categories child on child.id = new.subcategory_id and child.parent_id = root.id
  where account.id = new.financial_account_id
    and (
      (root.tenant_id = '11111111-1111-1111-1111-111111111111'::uuid
        and root.financial_account_id is null and root.is_default = true)
      or (root.tenant_id = account.tenant_id
        and root.financial_account_id = account.id and root.is_default = false)
    )
    and (
      new.subcategory_id is null
      or (child.id is not null and (
        (child.tenant_id = '11111111-1111-1111-1111-111111111111'::uuid
          and child.financial_account_id is null and child.is_default = true)
        or (child.tenant_id = account.tenant_id
          and child.financial_account_id = account.id and child.is_default = false)
      ))
    );
  if not found then
    raise exception 'Category selection is not valid for this financial account.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists financial_account_category_preferences_selection_check on financial_account_category_preferences;
create trigger financial_account_category_preferences_selection_check
  before insert or update on financial_account_category_preferences
  for each row execute function validate_financial_account_category_preference_selection();

drop trigger if exists financial_account_category_preference_evidence_selection_check on financial_account_category_preference_evidence;
create trigger financial_account_category_preference_evidence_selection_check
  before insert or update on financial_account_category_preference_evidence
  for each row execute function validate_financial_account_category_preference_selection();
