import { getSupabase } from './supabase'
import type { Incident, PublicStatusCheck, PublicStatusMonitor, PublicStatusPage, StatusPageConfig } from '../types'

interface StatusPageRow {
  slug: string
  title: string
  description: string
  enabled: boolean
  monitor_ids: string[]
}

interface PublicStatusMonitorRow {
  id: string
  name: string
  type: PublicStatusMonitor['type']
  status: PublicStatusMonitor['status']
  current_state: PublicStatusMonitor['currentState']
  uptime_24h: number
  uptime_7d: number
  uptime_30d: number
  last_check_at: string | null
  checks: Array<{ status: PublicStatusCheck['status']; checked_at: string }>
}

interface PublicStatusIncidentRow {
  id: string
  monitor_id: string
  status: Incident['status']
  cause: string
  started_at: string
  resolved_at: string | null
  duration_seconds: number | null
}

interface PublicStatusPageRow {
  title: string
  description: string
  monitors: PublicStatusMonitorRow[]
  incidents: PublicStatusIncidentRow[]
}

function mapStatusPage(row: StatusPageRow): StatusPageConfig {
  return {
    slug: row.slug,
    title: row.title,
    description: row.description,
    enabled: row.enabled,
    monitorIds: row.monitor_ids,
  }
}

function mapPublicMonitor(row: PublicStatusMonitorRow): PublicStatusMonitor {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    status: row.status,
    currentState: row.current_state,
    uptime24h: Number(row.uptime_24h),
    uptime7d: Number(row.uptime_7d),
    uptime30d: Number(row.uptime_30d),
    lastCheckAt: row.last_check_at,
    checks: row.checks.map((check) => ({ status: check.status, checkedAt: check.checked_at })),
  }
}

function mapPublicStatusPage(row: PublicStatusPageRow): PublicStatusPage {
  return {
    title: row.title,
    description: row.description,
    monitors: row.monitors.map(mapPublicMonitor),
    incidents: row.incidents.map((incident): Incident => ({
      id: incident.id,
      monitorId: incident.monitor_id,
      status: incident.status,
      cause: incident.cause,
      startedAt: incident.started_at,
      resolvedAt: incident.resolved_at,
      durationSeconds: incident.duration_seconds,
    })),
  }
}

export async function getStatusPage() {
  const supabase = getSupabase()
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError

  const { data, error } = await supabase
    .from('status_pages')
    .select('slug, title, description, enabled, monitor_ids')
    .eq('user_id', userData.user.id)
    .maybeSingle()
  if (error) throw error
  return data ? mapStatusPage(data as StatusPageRow) : null
}

export async function upsertStatusPage(config: StatusPageConfig) {
  const supabase = getSupabase()
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError

  const { data, error } = await supabase
    .from('status_pages')
    .upsert({
      user_id: userData.user.id,
      slug: config.slug,
      title: config.title,
      description: config.description,
      enabled: config.enabled,
      monitor_ids: config.monitorIds,
    }, { onConflict: 'user_id' })
    .select('slug, title, description, enabled, monitor_ids')
    .single()
  if (error) throw error
  return mapStatusPage(data as StatusPageRow)
}

export async function getPublicStatusPage(slug: string): Promise<PublicStatusPage | null> {
  const { data, error } = await getSupabase().rpc('get_public_status_page', { p_slug: slug })
  if (error) throw error
  return data ? mapPublicStatusPage(data as PublicStatusPageRow) : null
}
