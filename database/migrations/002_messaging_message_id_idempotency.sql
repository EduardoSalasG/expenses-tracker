do $$
begin
  if to_regclass('public.whatsapp_messages') is not null
     and to_regclass('public.messaging_messages') is null then
    alter table whatsapp_messages rename to messaging_messages;
  end if;
end $$;

alter table messaging_messages
  add column if not exists provider_message_id text;

alter table messaging_messages
  add column if not exists channel text not null default 'whatsapp';

alter table messaging_messages
  drop constraint if exists messaging_messages_parsing_status_check;

alter table messaging_messages
  drop constraint if exists messaging_messages_channel_check;

alter table messaging_messages
  add constraint messaging_messages_parsing_status_check
  check (parsing_status in ('processing', 'saved', 'needs_confirmation', 'unknown_user', 'failed'));

alter table messaging_messages
  add constraint messaging_messages_channel_check
  check (channel in ('whatsapp', 'telegram'));

drop index if exists messaging_messages_provider_message_id_uidx;
drop index if exists whatsapp_messages_provider_message_id_uidx;

create unique index if not exists messaging_messages_provider_message_id_uidx
  on messaging_messages (channel, provider_message_id)
  where provider_message_id is not null;
