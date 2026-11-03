import { computed, reactive, watch } from 'vue'
import { createMockChannels, createMockIncidents, createMockMonitors } from '../data/mock'
import type { Monitor, MonitorInput, NotificationChannel } from '../types'

interface MoneState {
  monitors: Monitor[]
  incidents: ReturnType<typeof createMockIncidents>
  channels: NotificationChannel[]
}

const storageKey = 'mone-demo-state-v1'

function initialState(): MoneState {
  return { monitors: createMockMonitors(), incidents: createMockIncidents(), channels: createMockChannels() }
}

function loadState(): MoneState {
  try {
    const saved = localStorage.getItem(storageKey)
    if (saved) return JSON.parse(saved) as MoneState
  } catch {
    // A blocked or invalid localStorage should not prevent the demo from loading.
  }
  return initialState()
}

const state = reactive<MoneState>(loadState())

watch(state, (value) => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(value))
  } catch {
    // The app remains usable when storage is unavailable.
  }
}, { deep: true })

export function useMone() {
  const activeMonitors = computed(() => state.monitors.filter((monitor) => monitor.status === 'active'))
  const downMonitors = computed(() => state.monitors.filter((monitor) => monitor.currentState === 'down' && monitor.status === 'active'))
  const overallUptime = computed(() => {
    if (!state.monitors.length) return 100
    return state.monitors.reduce((total, monitor) => total + monitor.uptime30d, 0) / state.monitors.length
  })

  function getMonitor(id: string) {
    return state.monitors.find((monitor) => monitor.id === id)
  }

  function createMonitor(input: MonitorInput) {
    const monitor: Monitor = {
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
    state.monitors.unshift(monitor)
    return monitor
  }

  function updateMonitor(id: string, input: MonitorInput) {
    const index = state.monitors.findIndex((monitor) => monitor.id === id)
    if (index !== -1) state.monitors[index] = { ...state.monitors[index], ...input }
  }

  function deleteMonitor(id: string) {
    state.monitors = state.monitors.filter((monitor) => monitor.id !== id)
    state.incidents = state.incidents.filter((incident) => incident.monitorId !== id)
  }

  function toggleMonitor(id: string) {
    const monitor = getMonitor(id)
    if (!monitor) return
    monitor.status = monitor.status === 'active' ? 'paused' : 'active'
    if (monitor.status === 'paused') monitor.currentState = 'pending'
  }

  function testMonitor(id: string) {
    const monitor = getMonitor(id)
    if (!monitor) return
    monitor.currentState = 'up'
    monitor.status = 'active'
    monitor.responseTimeMs = monitor.type === 'tcp' ? 36 : 128
    monitor.lastCheckAt = new Date().toISOString()
  }

  function addChannel(channel: Pick<NotificationChannel, 'name' | 'type' | 'target'>) {
    state.channels.push({ ...channel, id: crypto.randomUUID(), enabled: true, createdAt: new Date().toISOString() })
  }

  function deleteChannel(id: string) {
    state.channels = state.channels.filter((channel) => channel.id !== id)
  }

  function toggleChannel(id: string) {
    const channel = state.channels.find((item) => item.id === id)
    if (channel) channel.enabled = !channel.enabled
  }

  function resetDemo() {
    Object.assign(state, initialState())
  }

  return {
    state,
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
