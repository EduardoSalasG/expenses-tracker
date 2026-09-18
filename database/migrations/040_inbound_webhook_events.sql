create table if not exists inbound_webhook_events (
  id uuid primary key,
  channel text not null,
  provider_event_id text not null,
  payload jsonb not null,
  status text not null default 'pending',
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  correlation_id uuid not null,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (channel, provider_event_id)
);

create index if not exists inbound_webhook_events_pending_idx
  on inbound_webhook_events (status, next_attempt_at);
