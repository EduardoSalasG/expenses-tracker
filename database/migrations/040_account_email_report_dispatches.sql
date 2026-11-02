alter table report_dispatches add column if not exists financial_account_id uuid references financial_accounts(id) on delete cascade;
drop index if exists report_dispatches_unique_active_idx;
create unique index if not exists report_dispatches_account_recipient_active_idx
  on report_dispatches (coalesce(financial_account_id, '00000000-0000-0000-0000-000000000000'::uuid), channel, frequency, period_from, period_to, user_id)
  where status in ('pending', 'sent');
