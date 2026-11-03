export type MonitorType = 'http' | 'tcp'

export interface MonitorRecord {
  id: string
  user_id: string
  name: string
  type: MonitorType
  config: Record<string, unknown>
  interval_seconds: number
  failure_threshold: number
  success_threshold: number
}

export interface CheckResult {
  status: 'up' | 'down'
  responseTimeMs: number | null
  statusCode?: number
  errorMessage?: string
  metadata?: Record<string, unknown>
}

export interface HttpConfig {
  url: string
  method: string
  headers: Record<string, string>
  body: string
  expected_status_codes: number[]
  timeout_ms: number
}

export interface TcpConfig {
  host: string
  port: number
  timeout_ms: number
}

