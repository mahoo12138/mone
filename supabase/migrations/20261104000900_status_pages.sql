create table if not exists public.status_pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null,
  title text not null,
  description text not null default '',
  enabled boolean not null default true,
  monitor_ids uuid[] not null default '{}'::uuid[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint status_pages_user_unique unique (user_id),
  constraint status_pages_slug_format check (
    slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and length(slug) between 3 and 60
  ),
  constraint status_pages_title_length check (length(trim(title)) between 1 and 80),
  constraint status_pages_description_length check (length(description) <= 240)
);

create unique index if not exists status_pages_slug_idx on public.status_pages (slug);
create index if not exists status_pages_user_idx on public.status_pages (user_id);

drop trigger if exists status_pages_set_updated_at on public.status_pages;
create trigger status_pages_set_updated_at
before update on public.status_pages
for each row execute function public.set_updated_at();

alter table public.status_pages enable row level security;

drop policy if exists "Users can read their status page" on public.status_pages;
drop policy if exists "Users can create their status page" on public.status_pages;
drop policy if exists "Users can update their status page" on public.status_pages;
drop policy if exists "Users can delete their status page" on public.status_pages;

create policy "Users can read their status page" on public.status_pages
  for select using (auth.uid() = user_id);
create policy "Users can create their status page" on public.status_pages
  for insert with check (auth.uid() = user_id);
create policy "Users can update their status page" on public.status_pages
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their status page" on public.status_pages
  for delete using (auth.uid() = user_id);

create or replace function public.get_public_status_page(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with page as (
    select id, user_id, title, description, monitor_ids
    from status_pages
    where slug = p_slug and enabled
    limit 1
  ), selected_monitors as (
    select m.id, m.name, m.type, m.status, m.current_state,
           m.uptime_24h, m.uptime_7d, m.uptime_30d, m.last_check_at, m.created_at
    from page p
    join monitors m on m.user_id = p.user_id and m.id = any(p.monitor_ids)
  ), ranked_checks as (
    select cr.monitor_id, cr.status, cr.checked_at,
           row_number() over (partition by cr.monitor_id order by cr.checked_at desc) as rn
    from check_results cr
    join selected_monitors sm on sm.id = cr.monitor_id
  ), checks_by_monitor as (
    select monitor_id,
           jsonb_agg(
             jsonb_build_object('status', status, 'checked_at', checked_at)
             order by checked_at asc
           ) as checks
    from ranked_checks
    where rn <= 60
    group by monitor_id
  ), monitors_json as (
    select jsonb_agg(
             jsonb_build_object(
               'id', sm.id,
               'name', sm.name,
               'type', sm.type,
               'status', sm.status,
               'current_state', sm.current_state,
               'uptime_24h', sm.uptime_24h::double precision,
               'uptime_7d', sm.uptime_7d::double precision,
               'uptime_30d', sm.uptime_30d::double precision,
               'last_check_at', sm.last_check_at,
               'checks', coalesce(c.checks, '[]'::jsonb)
             )
             order by sm.created_at desc
           ) as monitors
    from selected_monitors sm
    left join checks_by_monitor c on c.monitor_id = sm.id
  ), incidents_json as (
    select jsonb_agg(
             jsonb_build_object(
               'id', i.id,
               'monitor_id', i.monitor_id,
               'status', i.status,
               'cause', i.cause,
               'started_at', i.started_at,
               'resolved_at', i.resolved_at,
               'duration_seconds', i.duration_seconds
             )
             order by i.started_at desc
           ) as incidents
    from (
      select inc.*
      from page p
      join incidents inc on inc.user_id = p.user_id and inc.monitor_id = any(p.monitor_ids)
      order by inc.started_at desc
      limit 5
    ) i
  )
  select case
    when p.id is null then null
    else jsonb_build_object(
      'title', p.title,
      'description', p.description,
      'monitors', coalesce(m.monitors, '[]'::jsonb),
      'incidents', coalesce(i.incidents, '[]'::jsonb)
    )
  end
  from page p
  cross join monitors_json m
  cross join incidents_json i;
$$;

revoke all on function public.get_public_status_page(text) from public;
grant execute on function public.get_public_status_page(text) to anon, authenticated;
