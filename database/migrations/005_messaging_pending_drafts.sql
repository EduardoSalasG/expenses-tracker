create table if not exists messaging_pending_drafts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  channel text not null default 'whatsapp' check (channel in ('whatsapp', 'telegram')),
  original_message text not null,
  draft_json jsonb not null,
  missing_fields text[] not null default array[]::text[],
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, user_id, channel)
);

alter table messaging_pending_drafts
  add column if not exists channel text not null default 'whatsapp';

alter table messaging_pending_drafts
  drop constraint if exists messaging_pending_drafts_channel_check;

alter table messaging_pending_drafts
  add constraint messaging_pending_drafts_channel_check
  check (channel in ('whatsapp', 'telegram'));

alter table messaging_pending_drafts
  drop constraint if exists messaging_pending_drafts_tenant_id_user_id_key;

alter table messaging_pending_drafts
  add constraint messaging_pending_drafts_tenant_id_user_id_channel_key
  unique (tenant_id, user_id, channel);

create index if not exists messaging_pending_drafts_active_idx
  on messaging_pending_drafts (tenant_id, user_id, expires_at desc);
