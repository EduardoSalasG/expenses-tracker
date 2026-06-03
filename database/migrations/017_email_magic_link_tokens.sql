create table if not exists email_magic_link_tokens (
  token text primary key,
  user_id uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists email_magic_link_tokens_user_idx
  on email_magic_link_tokens (user_id, created_at desc);
