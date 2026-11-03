alter table public.monitors
  add column last_response_time_ms integer,
  add column uptime_24h numeric(7, 4) not null default 100,
  add column uptime_7d numeric(7, 4) not null default 100,
  add column uptime_30d numeric(7, 4) not null default 100;

alter table public.monitors alter column user_id set default auth.uid();
alter table public.check_results alter column user_id set default auth.uid();
alter table public.incidents alter column user_id set default auth.uid();
alter table public.notification_channels alter column user_id set default auth.uid();
alter table public.notification_deliveries alter column user_id set default auth.uid();
