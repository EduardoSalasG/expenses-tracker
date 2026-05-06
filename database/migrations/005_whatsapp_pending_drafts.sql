create table if not exists whatsapp_pending_drafts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  original_message text not null,
  draft_json jsonb not null,
  missing_fields text[] not null default array[]::text[],
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create index if not exists whatsapp_pending_drafts_active_idx
  on whatsapp_pending_drafts (tenant_id, user_id, expires_at desc);
