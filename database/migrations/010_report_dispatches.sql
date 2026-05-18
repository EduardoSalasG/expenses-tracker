create table if not exists report_dispatches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  channel text not null default 'whatsapp',
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly', 'yearly')),
  period_from timestamptz not null,
  period_to timestamptz not null,
  status text not null check (status in ('pending', 'sent', 'failed')),
  sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists report_dispatches_unique_active_idx
  on report_dispatches (channel, frequency, period_from, period_to, user_id)
  where status in ('pending', 'sent');

create index if not exists report_dispatches_tenant_period_idx
  on report_dispatches (tenant_id, period_from desc, period_to desc);
