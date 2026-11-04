-- Data lifecycle. At 20 monitors x 60s the raw table grows ~864k rows/month, so raw
-- check results are rolled up into daily stats and then pruned.

create table if not exists public.monitor_daily_stats (
  monitor_id uuid not null references public.monitors(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  total_checks integer not null check (total_checks >= 0),
  up_checks integer not null check (up_checks >= 0 and up_checks <= total_checks),
  avg_response_time_ms integer,
  uptime numeric(7, 4) not null,
  primary key (monitor_id, day)
);

alter table public.monitor_daily_stats enable row level security;

drop policy if exists "owners read their own daily stats" on public.monitor_daily_stats;
create policy "owners read their own daily stats" on public.monitor_daily_stats
  for select using (auth.uid() = user_id);

create or replace function public.run_data_retention(
  p_raw_retention_days integer default 14,
  p_delivery_retention_days integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cutoff timestamptz := now() - make_interval(days => greatest(p_raw_retention_days, 1));
  v_delivery_cutoff timestamptz := now() - make_interval(days => greatest(p_delivery_retention_days, 1));
  v_rolled integer := 0;
  v_pruned integer := 0;
  v_deliveries integer := 0;
begin
  with aggregated as (
    insert into public.monitor_daily_stats as s (
      monitor_id, user_id, day, total_checks, up_checks, avg_response_time_ms, uptime
    )
    select
      cr.monitor_id,
      cr.user_id,
      date_trunc('day', cr.checked_at)::date,
      count(*),
      count(*) filter (where cr.status = 'up'),
      round(avg(cr.response_time_ms))::integer,
      coalesce(round(100.0 * count(*) filter (where cr.status = 'up') / nullif(count(*), 0), 4), 100)
    from public.check_results cr
    where cr.checked_at < v_cutoff
    group by cr.monitor_id, cr.user_id, date_trunc('day', cr.checked_at)::date
    on conflict (monitor_id, day) do update
      set total_checks = excluded.total_checks,
          up_checks = excluded.up_checks,
          avg_response_time_ms = excluded.avg_response_time_ms,
          uptime = excluded.uptime
    returning 1
  )
  select count(*) into v_rolled from aggregated;

  with removed as (
    delete from public.check_results
    where checked_at < v_cutoff
    returning 1
  )
  select count(*) into v_pruned from removed;

  with removed as (
    delete from public.notification_deliveries
    where created_at < v_delivery_cutoff
      and status <> 'pending'
    returning 1
  )
  select count(*) into v_deliveries from removed;

  return jsonb_build_object(
    'rolled_up', v_rolled,
    'check_results_deleted', v_pruned,
    'deliveries_deleted', v_deliveries,
    'raw_cutoff', v_cutoff,
    'delivery_cutoff', v_delivery_cutoff
  );
end;
$$;

revoke all on function public.run_data_retention(integer, integer) from public;
grant execute on function public.run_data_retention(integer, integer) to service_role;

-- Runs daily at 03:15 UTC, after the busiest probe windows.
select cron.unschedule('mone-data-retention')
where exists (select 1 from cron.job where jobname = 'mone-data-retention');

select cron.schedule(
  'mone-data-retention',
  '15 3 * * *',
  $$
    select net.http_post(
      url := 'https://ibnggtllzkvcbxwyfiub.supabase.co/functions/v1/run-data-retention',
      headers := jsonb_build_object(
        'content-type', 'application/json',
        'authorization', 'Bearer ' || (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'mone_run_due_checks_token'
          limit 1
        )
      ),
      body := '{}'::jsonb
    );
  $$
);
