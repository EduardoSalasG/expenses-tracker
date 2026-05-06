alter table whatsapp_messages
  add column if not exists provider_message_id text;

alter table whatsapp_messages
  drop constraint if exists whatsapp_messages_parsing_status_check;

alter table whatsapp_messages
  add constraint whatsapp_messages_parsing_status_check
  check (parsing_status in ('processing', 'saved', 'needs_confirmation', 'unknown_user', 'failed'));

create unique index if not exists whatsapp_messages_provider_message_id_uidx
  on whatsapp_messages (provider_message_id)
  where provider_message_id is not null;
