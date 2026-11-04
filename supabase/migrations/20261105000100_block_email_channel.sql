-- Email is blocked as a notification channel. The Edge Functions sandbox can open a TCP
-- socket to smtp.qq.com:587 but never receives the server greeting, so no alert could ever
-- be delivered; the type is closed off at the database so a channel cannot be created
-- through the API either. Telegram and Discord use HTTPS 443 and are unaffected.

delete from public.notification_channels where type = 'email';

alter table public.notification_channels drop constraint if exists notification_channels_type_check;
alter table public.notification_channels add constraint notification_channels_type_check
  check (type in ('telegram', 'discord'));

alter table public.notification_channels drop constraint if exists notification_channels_config_shape;
alter table public.notification_channels add constraint notification_channels_config_shape check (
  (type = 'telegram' and config ? 'bot_token' and config ? 'chat_id')
  or (type = 'discord' and config ? 'webhook_url')
);
