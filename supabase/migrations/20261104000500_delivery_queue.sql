-- Delivery queue consumption. record_check_result only enqueues rows; without these
-- the queue grows forever and no alert is ever sent.

create or replace function public.claim_pending_deliveries(p_limit integer)
returns setof public.notification_deliveries
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with candidates as (
    select id
    from public.notification_deliveries
    where status = 'pending'
      and attempts < 10
      and next_attempt_at <= now()
    order by next_attempt_at asc
    for update skip locked
    limit least(greatest(p_limit, 1), 50)
  )
  update public.notification_deliveries as d
  set attempts = d.attempts + 1,
      next_attempt_at = now() + interval '5 minutes'
  from candidates
  where d.id = candidates.id
  returning d.*;
end;
$$;

create or replace function public.record_delivery_result(
  p_delivery_id uuid,
  p_succeeded boolean,
  p_error text default null
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.notification_deliveries as d
  set status = case
        when p_succeeded then 'sent'
        when d.attempts >= 10 then 'failed'
        else 'pending'
      end,
      last_error = case when p_succeeded then null else left(coalesce(p_error, 'delivery failed'), 500) end,
      sent_at = case when p_succeeded then now() else d.sent_at end,
      next_attempt_at = case
        when p_succeeded then d.next_attempt_at
        else now() + make_interval(secs => least(60 * power(2, d.attempts)::integer, 3600))
      end
  where d.id = p_delivery_id;
$$;

revoke all on function public.claim_pending_deliveries(integer) from public;
revoke all on function public.record_delivery_result(uuid, boolean, text) from public;
grant execute on function public.claim_pending_deliveries(integer) to service_role;
grant execute on function public.record_delivery_result(uuid, boolean, text) to service_role;
