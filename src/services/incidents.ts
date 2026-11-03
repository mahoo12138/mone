import { getSupabase } from './supabase'
import type { Incident } from '../types'

export interface IncidentRow {
  id: string
  monitor_id: string
  status: 'ongoing' | 'resolved'
  cause: string
  started_at: string
  resolved_at: string | null
  duration_seconds: number | string | null
  created_at: string
}

export function mapIncident(row: IncidentRow): Incident {
  return {
    id: row.id,
    monitorId: row.monitor_id,
    status: row.status,
    cause: row.cause,
    startedAt: row.started_at,
    resolvedAt: row.resolved_at,
    durationSeconds: row.duration_seconds === null ? null : Number(row.duration_seconds),
  }
}

export async function listIncidents() {
  const { data, error } = await getSupabase().from('incidents').select('*').order('started_at', { ascending: false }).limit(100)
  if (error) throw error
  return (data as IncidentRow[]).map(mapIncident)
}
