export type MonitorType = 'http' | 'tcp' | 'ssl'
export type MonitorState = 'up' | 'down' | 'pending'
export type MonitorStatus = 'active' | 'paused'
export type HttpMethod = 'GET' | 'POST' | 'HEAD' | 'PUT' | 'PATCH' | 'DELETE'

export interface HttpConfig {
  url: string
  method: HttpMethod
  headers: Record<string, string>
  body: string
  expectedStatusCodes: number[]
  timeoutMs: number
}

export interface TcpConfig {
  host: string
  port: number
  timeoutMs: number
}

export interface SslConfig {
  host: string
  port: number
  expiryThresholdDays: number
}

export type MonitorConfig = HttpConfig | TcpConfig | SslConfig

export interface Monitor {
  id: string
  name: string
  type: MonitorType
  config: MonitorConfig
  status: MonitorStatus
  currentState: MonitorState
  intervalSeconds: number
  failureThreshold: number
  successThreshold: number
  responseTimeMs: number | null
  uptime24h: number
  uptime7d: number
  uptime30d: number
  lastCheckAt: string | null
  createdAt: string
}

export type MonitorInput = Pick<Monitor, 'name' | 'type' | 'config' | 'intervalSeconds' | 'failureThreshold' | 'successThreshold'>

export interface CheckResult {
  id: number
  monitorId: string
  status: Exclude<MonitorState, 'pending'>
  responseTimeMs: number | null
  statusCode?: number
  errorMessage?: string
  checkedAt: string
}

export interface Incident {
  id: string
  monitorId: string
  status: 'ongoing' | 'resolved'
  cause: string
  startedAt: string
  resolvedAt: string | null
  durationSeconds: number | null
}

export interface NotificationChannel {
  id: string
  name: string
  type: 'telegram' | 'discord'
  target: string
  enabled: boolean
  createdAt: string
}

export interface CertificateInfo {
  issuer: string
  subject: string
  validFrom: string
  validTo: string
  daysRemaining: number
  hostnameMatch: boolean
  chainValid: boolean
}
