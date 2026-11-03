import type { Monitor } from '../types'

export function formatRelativeTime(value: string | null) {
  if (!value) return 'Never'
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000))
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function formatDateTime(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

export function formatDuration(seconds: number | null) {
  if (seconds === null) return 'Ongoing'
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return `${hours}h ${remainder}m`
}

export function monitorTarget(monitor: Monitor) {
  if (monitor.type === 'http' && 'url' in monitor.config) return monitor.config.url.replace(/^https?:\/\//, '')
  if ('host' in monitor.config) return `${monitor.config.host}:${monitor.config.port}`
  return ''
}

export function formatInterval(seconds: number) {
  if (seconds < 60) return `${seconds}s`
  if (seconds % 3600 === 0) return `${seconds / 3600}h`
  return `${seconds / 60}m`
}
