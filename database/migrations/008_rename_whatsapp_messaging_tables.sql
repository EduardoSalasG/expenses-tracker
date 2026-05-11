do $$
begin
  if to_regclass('public.whatsapp_messages') is not null
     and to_regclass('public.messaging_messages') is null then
    alter table whatsapp_messages rename to messaging_messages;
  end if;

  if to_regclass('public.whatsapp_pending_drafts') is not null
     and to_regclass('public.messaging_pending_drafts') is null then
    alter table whatsapp_pending_drafts rename to messaging_pending_drafts;
  end if;
end $$;

alter table if exists messaging_messages
  drop constraint if exists whatsapp_messages_parsing_status_check;

alter table if exists messaging_messages
  drop constraint if exists messaging_messages_parsing_status_check;

alter table if exists messaging_messages
  add column if not exists channel text not null default 'whatsapp';

alter table if exists messaging_messages
  drop constraint if exists messaging_messages_channel_check;

alter table if exists messaging_messages
  add constraint messaging_messages_parsing_status_check
  check (parsing_status in ('processing', 'saved', 'needs_confirmation', 'unknown_user', 'failed'));

alter table if exists messaging_messages
  add constraint messaging_messages_channel_check
  check (channel in ('whatsapp', 'telegram'));

alter table if exists messaging_pending_drafts
  add column if not exists channel text not null default 'whatsapp';

alter table if exists messaging_pending_drafts
  drop constraint if exists messaging_pending_drafts_channel_check;

alter table if exists messaging_pending_drafts
  add constraint messaging_pending_drafts_channel_check
  check (channel in ('whatsapp', 'telegram'));

alter table if exists messaging_pending_drafts
  drop constraint if exists messaging_pending_drafts_tenant_id_user_id_key;

alter table if exists messaging_pending_drafts
  drop constraint if exists messaging_pending_drafts_tenant_id_user_id_channel_key;

alter table if exists messaging_pending_drafts
  add constraint messaging_pending_drafts_tenant_id_user_id_channel_key
  unique (tenant_id, user_id, channel);

drop index if exists whatsapp_messages_phone_created_idx;
drop index if exists whatsapp_messages_provider_message_id_uidx;
drop index if exists whatsapp_pending_drafts_active_idx;

create index if not exists messaging_messages_phone_created_idx
  on messaging_messages (from_phone_number, created_at desc);

create unique index if not exists messaging_messages_provider_message_id_uidx
  on messaging_messages (channel, provider_message_id)
  where provider_message_id is not null;

create index if not exists messaging_pending_drafts_active_idx
  on messaging_pending_drafts (tenant_id, user_id, expires_at desc);
