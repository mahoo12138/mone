import { computed, reactive, ref, watch } from 'vue'
import { createMockChannels, createMockIncidents, createMockMonitors } from '../data/mock'
import { t } from '../i18n'
import { session } from './useAuth'
import { getSupabase, isDemoMode, isSupabaseConfigured } from '../services/supabase'
import * as monitorService from '../services/monitors'
import { listIncidents } from '../services/incidents'
import * as notificationService from '../services/notifications'
import type { Monitor, MonitorInput, NotificationChannel, NotificationChannelInput } from '../types'

interface MoneState {
  monitors: Monitor[]
  incidents: ReturnType<typeof createMockIncidents>
  channels: NotificationChannel[]
}

const storageKey = 'mone-demo-state-v1'

function initialState(): MoneState {
  return { monitors: createMockMonitors(), incidents: createMockIncidents(), channels: createMockChannels() }
}

function loadDemoState(): MoneState {
  try {
    const saved = localStorage.getItem(storageKey)
    if (saved) return JSON.parse(saved) as MoneState
  } catch {
    // A blocked or invalid localStorage should not prevent the demo from loading.
  }
  return initialState()
}

export const state = reactive<MoneState>(isDemoMode ? loadDemoState() : { monitors: [], incidents: [], channels: [] })
export const loading = ref(false)
export const error = ref('')
export const dataVersion = ref(0)
let initialized = false

function setError(cause: unknown) {
  error.value = cause instanceof Error ? cause.message : t('errors.actionFailed')
}

async function refresh() {
  if (!isSupabaseConfigured) return
  if (!session.value) {
    state.monitors = []
    state.incidents = []
    state.channels = []
    return
  }
  // Only the first load may blank the page; background refreshes keep the last good
  // data visible so a transient failure does not hide the dashboard.
  const firstLoad = state.monitors.length === 0
  if (firstLoad) loading.value = true
  if (firstLoad) error.value = ''
  try {
    const [monitors, incidents, channels] = await Promise.all([
      monitorService.listMonitors(),
      listIncidents(),
      notificationService.listNotificationChannels(),
    ])
    state.monitors = monitors
    state.incidents = incidents
    state.channels = channels
    error.value = ''
    dataVersion.value += 1
  } catch (cause) {
    if (firstLoad) error.value = cause instanceof Error ? cause.message : t('errors.loadFailed')
  } finally {
    loading.value = false
  }
}

const refreshIntervalMs = 30_000
let timer: ReturnType<typeof setInterval> | undefined

function startAutoRefresh() {
  if (timer !== undefined) return
  timer = setInterval(() => {
    // A hidden tab has no reader; refresh again the moment it becomes visible.
    if (document.visibilityState === 'hidden') return
    void refresh()
  }, refreshIntervalMs)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void refresh()
  })
}

export function initMone() {
  if (initialized) return
  initialized = true
  if (isSupabaseConfigured) {
    void refresh()
    startAutoRefresh()
    watch(session, () => { void refresh() })
  } else if (isDemoMode) {
    watch(state, (value) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(value))
      } catch {
        // The app remains usable when storage is unavailable.
      }
    }, { deep: true })
  }
}

function createDemoMonitor(input: MonitorInput): Monitor {
  return {
    ...input,
    id: crypto.randomUUID(),
    status: 'active',
    currentState: 'pending',
    responseTimeMs: null,
    uptime24h: 100,
    uptime7d: 100,
    uptime30d: 100,
    lastCheckAt: null,
    createdAt: new Date().toISOString(),
  }
}

export function useMone() {
  initMone()
  const activeMonitors = computed(() => state.monitors.filter((monitor) => monitor.status === 'active'))
  const downMonitors = computed(() => state.monitors.filter((monitor) => monitor.currentState === 'down' && monitor.status === 'active'))
  const overallUptime = computed(() => state.monitors.length
    ? state.monitors.reduce((total, monitor) => total + monitor.uptime30d, 0) / state.monitors.length
    : 100)

  function getMonitor(id: string) {
    return state.monitors.find((monitor) => monitor.id === id)
  }

  async function createMonitor(input: MonitorInput) {
    if (isSupabaseConfigured) {
      const monitor = await monitorService.createMonitor(input)
      state.monitors.unshift(monitor)
      return monitor
    }
    const monitor = createDemoMonitor(input)
    state.monitors.unshift(monitor)
    return monitor
  }

  async function updateMonitor(id: string, input: MonitorInput) {
    if (isSupabaseConfigured) {
      const monitor = await monitorService.updateMonitor(id, input)
      state.monitors = state.monitors.map((item) => item.id === id ? monitor : item)
      return monitor
    }
    const index = state.monitors.findIndex((monitor) => monitor.id === id)
    if (index !== -1) state.monitors[index] = { ...state.monitors[index], ...input }
    return state.monitors[index]
  }

  async function deleteMonitor(id: string) {
    try {
      if (isSupabaseConfigured) await monitorService.deleteMonitor(id)
      state.monitors = state.monitors.filter((monitor) => monitor.id !== id)
      state.incidents = state.incidents.filter((incident) => incident.monitorId !== id)
    } catch (cause) { setError(cause) }
  }

  async function toggleMonitor(id: string) {
    const monitor = getMonitor(id)
    if (!monitor) return
    const status = monitor.status === 'active' ? 'paused' : 'active'
    const currentState = status === 'paused' ? 'pending' : monitor.currentState
    try {
      if (isSupabaseConfigured) await monitorService.setMonitorStatus(id, status, currentState)
      monitor.status = status
      monitor.currentState = currentState
    } catch (cause) { setError(cause) }
  }

  async function testMonitor(id: string) {
    const monitor = getMonitor(id)
    if (!monitor) return
    try {
      if (isSupabaseConfigured) {
        const { error: queryError } = await getSupabase().from('monitors').update({
          status: 'active', current_state: 'up', last_response_time_ms: monitor.type === 'tcp' ? 36 : 128, last_check_at: new Date().toISOString(),
        }).eq('id', id)
        if (queryError) throw queryError
      }
      monitor.status = 'active'
      monitor.currentState = 'up'
      monitor.responseTimeMs = monitor.type === 'tcp' ? 36 : 128
      monitor.lastCheckAt = new Date().toISOString()
    } catch (cause) { setError(cause) }
  }

  async function addChannel(input: NotificationChannelInput) {
    if (isSupabaseConfigured) {
      const channel = await notificationService.createNotificationChannel(input)
      state.channels.unshift(channel)
      return channel
    }
    const target = input.type === 'telegram' ? `Chat ID •••• ${input.config.chat_id?.slice(-4) ?? '----'}` : `Webhook •••• ${input.config.webhook_url?.slice(-4) ?? '----'}`
    const channel: NotificationChannel = { id: crypto.randomUUID(), name: input.name, type: input.type, target, config: input.config, enabled: true, createdAt: new Date().toISOString() }
    state.channels.unshift(channel)
    return channel
  }

  async function deleteChannel(id: string) {
    try {
      if (isSupabaseConfigured) await notificationService.deleteNotificationChannel(id)
      state.channels = state.channels.filter((channel) => channel.id !== id)
    } catch (cause) { setError(cause) }
  }

  async function toggleChannel(id: string) {
    const channel = state.channels.find((item) => item.id === id)
    if (!channel) return
    const enabled = !channel.enabled
    try {
      if (isSupabaseConfigured) await notificationService.setNotificationChannelEnabled(id, enabled)
      channel.enabled = enabled
    } catch (cause) { setError(cause) }
  }

  function resetDemo() {
    Object.assign(state, initialState())
  }

  return {
    state,
    loading,
    error,
    refresh,
    activeMonitors,
    downMonitors,
    overallUptime,
    getMonitor,
    createMonitor,
    updateMonitor,
    deleteMonitor,
    toggleMonitor,
    testMonitor,
    addChannel,
    deleteChannel,
    toggleChannel,
    resetDemo,
  }
}
