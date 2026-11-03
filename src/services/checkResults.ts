import { getSupabase } from './supabase'
import type { CheckResult } from '../types'

interface CheckResultRow {
  id: number
  monitor_id: string
  status: 'up' | 'down'
  response_time_ms: number | null
  status_code: number | null
  error_message: string | null
  checked_at: string
}

export async function listCheckResults(monitorId: string, limit = 48) {
  const { data, error } = await getSupabase()
    .from('check_results')
    .select('*')
    .eq('monitor_id', monitorId)
    .order('checked_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data as CheckResultRow[]).reverse().map((row): CheckResult => ({
    id: row.id,
    monitorId: row.monitor_id,
    status: row.status,
    responseTimeMs: row.response_time_ms,
    statusCode: row.status_code ?? undefined,
    errorMessage: row.error_message ?? undefined,
    checkedAt: row.checked_at,
  }))
}
