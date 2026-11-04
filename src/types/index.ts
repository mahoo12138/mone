export type MonitorType = 'http' | 'tcp'
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

export type MonitorConfig = HttpConfig | TcpConfig

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
  config: Record<string, string>
  enabled: boolean
  createdAt: string
}

export interface NotificationChannelInput {
  name: string
  type: 'telegram' | 'discord'
  config: Record<string, string>
}

export interface StatusPageConfig {
  enabled: boolean
  slug: string
  title: string
  description: string
  monitorIds: string[]
}

export interface PublicStatusCheck {
  status: 'up' | 'down'
  checkedAt: string
}

export interface PublicStatusMonitor {
  id: string
  name: string
  type: MonitorType
  status: MonitorStatus
  currentState: MonitorState
  uptime24h: number
  uptime7d: number
  uptime30d: number
  lastCheckAt: string | null
  checks: PublicStatusCheck[]
}

export interface PublicStatusPage {
  title: string
  description: string
  monitors: PublicStatusMonitor[]
  incidents: Incident[]
}
