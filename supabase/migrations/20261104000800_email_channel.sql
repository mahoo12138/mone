-- Email notification channel. SMTP credentials stay in Edge secrets, so the channel
-- row only ever stores the recipient address.

alter table public.notification_channels drop constraint if exists notification_channels_type_check;
alter table public.notification_channels add constraint notification_channels_type_check
  check (type in ('telegram', 'discord', 'email'));

alter table public.notification_channels drop constraint if exists notification_channels_config_shape;
alter table public.notification_channels add constraint notification_channels_config_shape check (
  (type = 'telegram' and config ? 'bot_token' and config ? 'chat_id')
  or (type = 'discord' and config ? 'webhook_url')
  or (type = 'email' and config ? 'to' and config ->> 'to' like '%@%.%')
);
