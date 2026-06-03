alter table if exists telegram_link_tokens
  add column if not exists phone_number text;

create index if not exists telegram_link_tokens_phone_number_idx
  on telegram_link_tokens (phone_number, created_at desc);
