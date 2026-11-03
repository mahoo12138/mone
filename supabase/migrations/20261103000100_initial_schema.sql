create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.monitors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  type text not null check (type in ('http', 'tcp', 'ssl')),
  config jsonb not null,
  status text not null default 'active' check (status in ('active', 'paused')),
  current_state text not null default 'pending' check (current_state in ('up', 'down', 'pending')),
  interval_seconds integer not null check (interval_seconds between 30 and 86400),
  failure_threshold integer not null default 3 check (failure_threshold between 1 and 10),
  success_threshold integer not null default 2 check (success_threshold between 1 and 10),
  next_check_at timestamptz not null default now(),
  last_check_at timestamptz,
  lease_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint monitors_config_shape check (
    (type = 'http' and config ? 'url' and config ? 'method' and config ? 'timeout_ms')
    or (type = 'tcp' and config ? 'host' and config ? 'port' and config ? 'timeout_ms')
    or (type = 'ssl' and config ? 'host' and config ? 'port' and config ? 'expiry_threshold_days')
  )
);

create trigger monitors_set_updated_at
before update on public.monitors
for each row execute function public.set_updated_at();

create index monitors_due_idx on public.monitors (next_check_at)
  where status = 'active';
create index monitors_user_idx on public.monitors (user_id, created_at desc);

create table public.check_results (
  id bigint generated always as identity primary key,
  monitor_id uuid not null references public.monitors(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('up', 'down')),
  response_time_ms integer check (response_time_ms is null or response_time_ms >= 0),
  status_code integer check (status_code is null or status_code between 100 and 599),
  error_message text,
  checked_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index check_results_monitor_time_idx on public.check_results (monitor_id, checked_at desc);
create index check_results_cleanup_idx on public.check_results (checked_at);

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  monitor_id uuid not null references public.monitors(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'ongoing' check (status in ('ongoing', 'resolved')),
  cause text not null,
  started_at timestamptz not null default now(),
  resolved_at timestamptz,
  duration_seconds bigint check (duration_seconds is null or duration_seconds >= 0),
  created_at timestamptz not null default now(),
  constraint incidents_resolution_consistent check (
    (status = 'ongoing' and resolved_at is null and duration_seconds is null)
    or (status = 'resolved' and resolved_at is not null and duration_seconds is not null)
  )
);

create unique index incidents_one_ongoing_per_monitor_idx on public.incidents (monitor_id)
  where status = 'ongoing';
create index incidents_user_time_idx on public.incidents (user_id, started_at desc);

create table public.notification_channels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  type text not null check (type in ('telegram', 'discord')),
  config jsonb not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_channels_config_shape check (
    (type = 'telegram' and config ? 'bot_token' and config ? 'chat_id')
    or (type = 'discord' and config ? 'webhook_url')
  )
);

create trigger notification_channels_set_updated_at
before update on public.notification_channels
for each row execute function public.set_updated_at();

create index notification_channels_user_idx on public.notification_channels (user_id, created_at desc);

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  channel_id uuid not null references public.notification_channels(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('down', 'recovered', 'ssl_expiring')),
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  attempts integer not null default 0 check (attempts between 0 and 10),
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  next_attempt_at timestamptz not null default now(),
  unique (incident_id, channel_id, event_type)
);

create index notification_deliveries_queue_idx on public.notification_deliveries (next_attempt_at)
  where status in ('pending', 'failed');
create index notification_deliveries_user_time_idx on public.notification_deliveries (user_id, created_at desc);

alter table public.monitors enable row level security;
alter table public.check_results enable row level security;
alter table public.incidents enable row level security;
alter table public.notification_channels enable row level security;
alter table public.notification_deliveries enable row level security;

create policy "Users can read their monitors" on public.monitors
  for select using (auth.uid() = user_id);
create policy "Users can create their monitors" on public.monitors
  for insert with check (auth.uid() = user_id);
create policy "Users can update their monitors" on public.monitors
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their monitors" on public.monitors
  for delete using (auth.uid() = user_id);

create policy "Users can read their check results" on public.check_results
  for select using (auth.uid() = user_id);
create policy "Users can insert their check results" on public.check_results
  for insert with check (auth.uid() = user_id);

create policy "Users can read their incidents" on public.incidents
  for select using (auth.uid() = user_id);
create policy "Users can insert their incidents" on public.incidents
  for insert with check (auth.uid() = user_id);
create policy "Users can update their incidents" on public.incidents
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can read their notification channels" on public.notification_channels
  for select using (auth.uid() = user_id);
create policy "Users can create their notification channels" on public.notification_channels
  for insert with check (auth.uid() = user_id);
create policy "Users can update their notification channels" on public.notification_channels
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their notification channels" on public.notification_channels
  for delete using (auth.uid() = user_id);

create policy "Users can read their notification deliveries" on public.notification_deliveries
  for select using (auth.uid() = user_id);
create policy "Users can insert their notification deliveries" on public.notification_deliveries
  for insert with check (auth.uid() = user_id);
create policy "Users can update their notification deliveries" on public.notification_deliveries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
