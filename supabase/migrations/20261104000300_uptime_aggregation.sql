-- Uptime was never computed, so the dashboard showed the 100% column default forever.
create or replace function public.refresh_monitor_uptime(p_monitor_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  with windowed as (
    select
      count(*) filter (where checked_at >= now() - interval '24 hours') as total_24h,
      count(*) filter (where checked_at >= now() - interval '24 hours' and status = 'up') as up_24h,
      count(*) filter (where checked_at >= now() - interval '7 days') as total_7d,
      count(*) filter (where checked_at >= now() - interval '7 days' and status = 'up') as up_7d,
      count(*) filter (where checked_at >= now() - interval '30 days') as total_30d,
      count(*) filter (where checked_at >= now() - interval '30 days' and status = 'up') as up_30d
    from public.check_results
    where monitor_id = p_monitor_id
      and checked_at >= now() - interval '30 days'
  )
  update public.monitors
  set uptime_24h = coalesce(round(100.0 * up_24h / nullif(total_24h, 0), 4), 100),
      uptime_7d = coalesce(round(100.0 * up_7d / nullif(total_7d, 0), 4), 100),
      uptime_30d = coalesce(round(100.0 * up_30d / nullif(total_30d, 0), 4), 100)
  from windowed
  where id = p_monitor_id;
$$;

revoke all on function public.refresh_monitor_uptime(uuid) from public;
grant execute on function public.refresh_monitor_uptime(uuid) to service_role;

create or replace function public.record_check_result(
  p_monitor_id uuid,
  p_status text,
  p_response_time_ms integer,
  p_status_code integer,
  p_error_message text,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  monitor public.monitors;
  incident public.incidents;
  result public.check_results;
  notification_count integer := 0;
  v_event_type text;
begin
  if p_status not in ('up', 'down') then
    raise exception 'invalid check status';
  end if;

  select * into monitor
  from public.monitors
  where id = p_monitor_id
  for update;

  if not found then
    raise exception 'monitor % not found', p_monitor_id;
  end if;

  insert into public.check_results (
    monitor_id, user_id, status, response_time_ms, status_code, error_message, checked_at, metadata
  ) values (
    p_monitor_id, monitor.user_id, p_status, p_response_time_ms, p_status_code, p_error_message, now(), coalesce(p_metadata, '{}'::jsonb)
  )
  returning * into result;

  if p_status = 'up' then
    update public.monitors as m
    set consecutive_successes = m.consecutive_successes + 1,
        consecutive_failures = 0,
        last_response_time_ms = coalesce(p_response_time_ms, m.last_response_time_ms),
        last_check_at = now(),
        next_check_at = now() + make_interval(secs => m.interval_seconds),
        lease_until = null,
        updated_at = now()
    where m.id = p_monitor_id
    returning m.* into monitor;

    if monitor.current_state = 'pending'
       or (monitor.current_state = 'down' and monitor.consecutive_successes >= monitor.success_threshold) then
      update public.monitors
      set current_state = 'up',
          consecutive_failures = 0,
          consecutive_successes = 0,
          updated_at = now()
      where id = p_monitor_id
      returning * into monitor;

      update public.incidents
      set status = 'resolved',
          resolved_at = now(),
          duration_seconds = greatest(0, floor(extract(epoch from (now() - started_at)))::bigint)
      where monitor_id = p_monitor_id
        and status = 'ongoing'
      returning * into incident;

      if found then
        v_event_type := 'recovered';
      end if;
    end if;
  else
    update public.monitors as m
    set consecutive_failures = m.consecutive_failures + 1,
        consecutive_successes = 0,
        last_response_time_ms = null,
        last_check_at = now(),
        next_check_at = now() + make_interval(secs => m.interval_seconds),
        lease_until = null,
        updated_at = now()
    where m.id = p_monitor_id
    returning m.* into monitor;

    if monitor.current_state <> 'down' and monitor.consecutive_failures >= monitor.failure_threshold then
      update public.monitors
      set current_state = 'down',
          consecutive_failures = 0,
          consecutive_successes = 0,
          updated_at = now()
      where id = p_monitor_id
      returning * into monitor;

      select * into incident
      from public.incidents
      where monitor_id = p_monitor_id
        and status = 'ongoing'
      for update;

      if not found then
        insert into public.incidents (
          monitor_id, user_id, status, cause, started_at
        ) values (
          p_monitor_id, monitor.user_id, 'ongoing',
          coalesce(nullif(p_error_message, ''), 'Check failed'), now()
        )
        returning * into incident;
      end if;

      v_event_type := 'down';
    end if;
  end if;

  if v_event_type is not null then
    insert into public.notification_deliveries (
      incident_id, channel_id, user_id, event_type, status, next_attempt_at
    )
    select incident.id, channel.id, incident.user_id, v_event_type, 'pending', now()
    from public.notification_channels as channel
    where channel.user_id = incident.user_id
      and channel.enabled
    on conflict (incident_id, channel_id, event_type) do nothing;

    get diagnostics notification_count = row_count;
  end if;

  perform public.refresh_monitor_uptime(p_monitor_id);

  return jsonb_build_object(
    'monitor_id', monitor.id,
    'current_state', monitor.current_state,
    'result_id', result.id,
    'incident_id', incident.id,
    'event_type', v_event_type,
    'notification_count', notification_count
  );
end;
$$;

revoke all on function public.claim_due_monitors(integer, integer) from public;
revoke all on function public.record_check_result(uuid, text, integer, integer, text, jsonb) from public;
grant execute on function public.claim_due_monitors(integer, integer) to service_role;
grant execute on function public.record_check_result(uuid, text, integer, integer, text, jsonb) to service_role;
