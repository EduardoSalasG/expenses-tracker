alter table push_deliveries drop constraint if exists push_deliveries_status_check;
alter table push_deliveries add constraint push_deliveries_status_check
  check (status in ('pending', 'processing', 'sent', 'failed'));
alter table push_deliveries add column if not exists locked_at timestamptz;
drop index if exists push_deliveries_pending_idx;
create index if not exists push_deliveries_claim_idx
  on push_deliveries (status, locked_at, created_at asc);
