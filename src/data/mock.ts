import type { CheckResult, Incident, Monitor, NotificationChannel } from '../types'

const isoMinutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString()

export function createMockMonitors(): Monitor[] {
  return [
    {
      id: 'core-api',
      name: 'Core API',
      type: 'http',
      config: { url: 'https://api.example.com/health', method: 'GET', headers: {}, body: '', expectedStatusCodes: [200], timeoutMs: 10000 },
      status: 'active', currentState: 'up', intervalSeconds: 60, failureThreshold: 3, successThreshold: 2,
      responseTimeMs: 184, uptime24h: 100, uptime7d: 99.99, uptime30d: 99.97,
      lastCheckAt: isoMinutesAgo(1), createdAt: isoMinutesAgo(60 * 24 * 92),
    },
    {
      id: 'customer-portal',
      name: 'Customer portal',
      type: 'http',
      config: { url: 'https://app.example.com', method: 'GET', headers: {}, body: '', expectedStatusCodes: [200], timeoutMs: 8000 },
      status: 'active', currentState: 'down', intervalSeconds: 60, failureThreshold: 2, successThreshold: 2,
      responseTimeMs: null, uptime24h: 96.42, uptime7d: 99.12, uptime30d: 99.56,
      lastCheckAt: isoMinutesAgo(2), createdAt: isoMinutesAgo(60 * 24 * 81),
    },
    {
      id: 'postgres-primary',
      name: 'Postgres primary',
      type: 'tcp',
      config: { host: 'db.example.com', port: 5432, timeoutMs: 5000 },
      status: 'active', currentState: 'up', intervalSeconds: 120, failureThreshold: 3, successThreshold: 2,
      responseTimeMs: 32, uptime24h: 100, uptime7d: 100, uptime30d: 99.99,
      lastCheckAt: isoMinutesAgo(3), createdAt: isoMinutesAgo(60 * 24 * 76),
    },
    {
      id: 'billing-webhook',
      name: 'Billing webhook',
      type: 'http',
      config: { url: 'https://hooks.example.com/billing', method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"source":"mone"}', expectedStatusCodes: [200, 204], timeoutMs: 10000 },
      status: 'paused', currentState: 'pending', intervalSeconds: 300, failureThreshold: 3, successThreshold: 2,
      responseTimeMs: 247, uptime24h: 99.84, uptime7d: 99.72, uptime30d: 99.81,
      lastCheckAt: isoMinutesAgo(62), createdAt: isoMinutesAgo(60 * 24 * 43),
    },
    {
      id: 'search-service',
      name: 'Search service',
      type: 'http',
      config: { url: 'https://search.example.com/status', method: 'HEAD', headers: {}, body: '', expectedStatusCodes: [200], timeoutMs: 6000 },
      status: 'active', currentState: 'up', intervalSeconds: 180, failureThreshold: 2, successThreshold: 2,
      responseTimeMs: 421, uptime24h: 99.93, uptime7d: 99.86, uptime30d: 99.74,
      lastCheckAt: isoMinutesAgo(4), createdAt: isoMinutesAgo(60 * 24 * 28),
    },
  ]
}

export function createMockIncidents(): Incident[] {
  return [
    { id: 'inc-1048', monitorId: 'customer-portal', status: 'ongoing', cause: 'HTTP 503 — Service Unavailable', startedAt: isoMinutesAgo(47), resolvedAt: null, durationSeconds: null },
    { id: 'inc-1047', monitorId: 'search-service', status: 'resolved', cause: 'Connection timeout after 6,000 ms', startedAt: isoMinutesAgo(60 * 29), resolvedAt: isoMinutesAgo(60 * 29 - 18), durationSeconds: 1080 },
    { id: 'inc-1046', monitorId: 'core-api', status: 'resolved', cause: 'Expected HTTP 200, received 502', startedAt: isoMinutesAgo(60 * 74), resolvedAt: isoMinutesAgo(60 * 74 - 7), durationSeconds: 420 },
    { id: 'inc-1045', monitorId: 'customer-portal', status: 'resolved', cause: 'Upstream connect error after deploy', startedAt: isoMinutesAgo(60 * 24 * 9), resolvedAt: isoMinutesAgo(60 * 24 * 9 - 34), durationSeconds: 2040 },
  ]
}

export function createMockChannels(): NotificationChannel[] {
  return [
    { id: 'telegram-ops', name: 'Ops on Telegram', type: 'telegram', target: 'Chat ID •••• 4821', config: { bot_token: 'demo', chat_id: '12344821' }, enabled: true, createdAt: isoMinutesAgo(60 * 24 * 30) },
    { id: 'discord-team', name: 'Team Discord', type: 'discord', target: 'Webhook •••• 9f2a', config: { webhook_url: 'https://discord.test/9f2a' }, enabled: false, createdAt: isoMinutesAgo(60 * 24 * 12) },
  ]
}

export function createCheckResults(monitor: Monitor, count = 48): CheckResult[] {
  const base = monitor.responseTimeMs ?? (monitor.type === 'tcp' ? 40 : 220)
  return Array.from({ length: count }, (_, index) => {
    const isDown = monitor.currentState === 'down' ? index > count - 5 : index === 11 && monitor.id === 'search-service'
    const wave = Math.sin(index * 0.72) * base * 0.18 + Math.cos(index * 0.21) * base * 0.08
    return {
      id: index + 1,
      monitorId: monitor.id,
      status: isDown ? 'down' : 'up',
      responseTimeMs: isDown ? null : Math.max(8, Math.round(base + wave)),
      statusCode: monitor.type === 'http' ? (isDown ? 503 : 200) : undefined,
      errorMessage: isDown ? 'Service unavailable' : undefined,
      checkedAt: isoMinutesAgo((count - index) * 30),
    }
  })
}
