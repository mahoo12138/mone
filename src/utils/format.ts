import { intlLocale, t } from '../i18n'
import type { Monitor } from '../types'

export function formatRelativeTime(value: string | null) {
  if (!value) return t('time.never')
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000))
  if (seconds < 60) return t('time.justNow')
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return t('time.minutesAgo', { count: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('time.hoursAgo', { count: hours })
  return t('time.daysAgo', { count: Math.floor(hours / 24) })
}

export function formatDateTime(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(intlLocale.value, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

export function formatDuration(seconds: number | null) {
  if (seconds === null) return t('time.ongoing')
  if (seconds < 60) return t('time.durationSeconds', { count: seconds })
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return t('time.durationMinutes', { count: minutes })
  return t('time.durationHours', { hours: Math.floor(minutes / 60), minutes: minutes % 60 })
}

export function monitorTarget(monitor: Monitor) {
  if (monitor.type === 'http' && 'url' in monitor.config) return monitor.config.url.replace(/^https?:\/\//, '')
  if ('host' in monitor.config) return `${monitor.config.host}:${monitor.config.port}`
  return ''
}

export function formatInterval(seconds: number) {
  if (seconds < 60) return t('time.intervalSeconds', { count: seconds })
  if (seconds % 3600 === 0) return t('time.intervalHours', { count: seconds / 3600 })
  return t('time.intervalMinutes', { count: seconds / 60 })
}
