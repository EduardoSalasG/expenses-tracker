create table if not exists telegram_link_tokens (
  token text primary key,
  chat_id text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists telegram_link_tokens_chat_id_idx
  on telegram_link_tokens (chat_id, created_at desc);
