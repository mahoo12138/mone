import { getSupabase } from './supabase'
import type { HttpConfig, Monitor, MonitorConfig, MonitorInput } from '../types'

interface MonitorRow {
  id: string
  name: string
  type: Monitor['type']
  config: Record<string, unknown>
  status: Monitor['status']
  current_state: Monitor['currentState']
  interval_seconds: number
  failure_threshold: number
  success_threshold: number
  last_response_time_ms: number | null
  uptime_24h: string | number
  uptime_7d: string | number
  uptime_30d: string | number
  last_check_at: string | null
  created_at: string
}

function mapConfig(type: Monitor['type'], config: Record<string, unknown>): MonitorConfig {
  if (type === 'http') {
    return {
      url: String(config.url ?? ''),
      method: (config.method as HttpConfig['method'] ?? 'GET'),
      headers: (config.headers as HttpConfig['headers'] ?? {}),
      body: String(config.body ?? ''),
      expectedStatusCodes: (config.expected_status_codes as number[] ?? [200]),
      timeoutMs: Number(config.timeout_ms ?? 10000),
    }
  }
  return {
    host: String(config.host ?? ''),
    port: Number(config.port ?? 443),
    timeoutMs: Number(config.timeout_ms ?? 5000),
  }
}

function toConfig(config: MonitorConfig): Record<string, unknown> {
  if ('url' in config) {
    return {
      url: config.url, method: config.method, headers: config.headers, body: config.body,
      expected_status_codes: config.expectedStatusCodes, timeout_ms: config.timeoutMs,
    }
  }
  return { host: config.host, port: config.port, timeout_ms: config.timeoutMs }
}

function mapMonitor(row: MonitorRow): Monitor {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    config: mapConfig(row.type, row.config),
    status: row.status,
    currentState: row.current_state,
    intervalSeconds: row.interval_seconds,
    failureThreshold: row.failure_threshold,
    successThreshold: row.success_threshold,
    responseTimeMs: row.last_response_time_ms,
    uptime24h: Number(row.uptime_24h),
    uptime7d: Number(row.uptime_7d),
    uptime30d: Number(row.uptime_30d),
    lastCheckAt: row.last_check_at,
    createdAt: row.created_at,
  }
}

export async function listMonitors() {
  const { data, error } = await getSupabase().from('monitors').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data as MonitorRow[]).map(mapMonitor)
}

export async function createMonitor(input: MonitorInput) {
  const { data, error } = await getSupabase().from('monitors').insert({
    name: input.name, type: input.type, config: toConfig(input.config),
    interval_seconds: input.intervalSeconds, failure_threshold: input.failureThreshold, success_threshold: input.successThreshold,
  }).select('*').single()
  if (error) throw error
  return mapMonitor(data as MonitorRow)
}

export async function updateMonitor(id: string, input: MonitorInput) {
  const { data, error } = await getSupabase().from('monitors').update({
    name: input.name, type: input.type, config: toConfig(input.config),
    interval_seconds: input.intervalSeconds, failure_threshold: input.failureThreshold, success_threshold: input.successThreshold,
    next_check_at: new Date().toISOString(),
  }).eq('id', id).select('*').single()
  if (error) throw error
  return mapMonitor(data as MonitorRow)
}

export async function deleteMonitor(id: string) {
  const { error } = await getSupabase().from('monitors').delete().eq('id', id)
  if (error) throw error
}

export async function setMonitorStatus(id: string, status: Monitor['status'], currentState: Monitor['currentState']) {
  const { error } = await getSupabase().from('monitors').update({ status, current_state: currentState }).eq('id', id)
  if (error) throw error
}
