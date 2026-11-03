<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from '@cormijs/vue/client'
import { ArrowLeft, Check, Clock3, Globe2, Pause, Pencil, Play, ShieldCheck, Trash2, X, Zap } from '@lucide/vue'
import AppModal from '../../components/common/AppModal.vue'
import EmptyState from '../../components/common/EmptyState.vue'
import MonitorTypeBadge from '../../components/common/MonitorTypeBadge.vue'
import StatusBadge from '../../components/common/StatusBadge.vue'
import MonitorForm from '../../components/monitors/MonitorForm.vue'
import ResponseChart from '../../components/charts/ResponseChart.vue'
import HeartbeatBar from '../../components/charts/HeartbeatBar.vue'
import { useMone } from '../../composables/useMone'
import { createCheckResults } from '../../data/mock'
import type { Monitor } from '../../types'
import { formatDateTime, formatDuration, formatInterval, formatRelativeTime, monitorTarget } from '../../utils/format'

const route = useRoute()
const router = useRouter()
const { state, getMonitor, deleteMonitor, toggleMonitor, testMonitor } = useMone()
const monitor = computed(() => getMonitor(String(route.params.id)))
const results = computed(() => monitor.value?.lastCheckAt ? createCheckResults(monitor.value) : [])
const incidents = computed(() => state.incidents.filter((incident) => incident.monitorId === String(route.params.id)))
const editing = ref(false)
const deleting = ref(false)
const testing = ref(false)
const tested = ref(false)
const range = ref<'24h' | '7d' | '30d'>('24h')
const uptime = computed(() => monitor.value ? ({ '24h': monitor.value.uptime24h, '7d': monitor.value.uptime7d, '30d': monitor.value.uptime30d })[range.value] : 0)
const certificate = { issuer: "Let's Encrypt E7", subject: 'example.com', validFrom: '2026-09-18T00:00:00Z', validTo: '2026-12-17T23:59:59Z', daysRemaining: 44, hostnameMatch: true, chainValid: true }

function runTest() {
  if (!monitor.value) return
  testing.value = true
  tested.value = false
  window.setTimeout(() => {
    if (monitor.value) testMonitor(monitor.value.id)
    testing.value = false
    tested.value = true
  }, 650)
}
</script>

<template>
  <div v-if="monitor">
    <RouterLink to="/monitors" class="mb-6 inline-flex items-center gap-2 text-xs font-bold text-muted hover:text-ink"><ArrowLeft :size="15" /> All monitors</RouterLink>
    <header class="mb-7 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
      <div>
        <div class="mb-3 flex flex-wrap items-center gap-2"><MonitorTypeBadge :type="monitor.type" /><StatusBadge :state="monitor.currentState" :paused="monitor.status === 'paused'" /></div>
        <h1 class="text-3xl font-bold tracking-[-0.04em] sm:text-4xl">{{ monitor.name }}</h1>
        <p class="mt-2 flex items-center gap-2 font-mono text-xs text-muted"><Globe2 :size="14" />{{ monitorTarget(monitor) }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button class="button-secondary" :disabled="testing" @click="runTest"><Zap :size="16" :class="{ 'animate-pulse': testing }" />{{ testing ? 'Testing…' : tested ? 'Test passed' : 'Test monitor' }}</button>
        <button class="button-secondary" @click="toggleMonitor(monitor.id)"><Pause v-if="monitor.status === 'active'" :size="16" /><Play v-else :size="16" />{{ monitor.status === 'active' ? 'Pause' : 'Resume' }}</button>
        <button class="button-secondary" @click="editing = true"><Pencil :size="16" /> Edit</button>
        <button class="icon-button border-line bg-paper hover:text-down" aria-label="Delete monitor" @click="deleting = true"><Trash2 :size="16" /></button>
      </div>
    </header>

    <section class="mb-5 grid gap-3 sm:grid-cols-3">
      <article class="surface p-5"><p class="eyebrow">Last check</p><p class="mt-3 text-lg font-bold">{{ formatRelativeTime(monitor.lastCheckAt) }}</p><p class="mt-1 text-xs text-muted">{{ formatDateTime(monitor.lastCheckAt) }}</p></article>
      <article class="surface p-5"><p class="eyebrow">Response time</p><p class="mt-3 font-mono text-2xl font-medium">{{ monitor.responseTimeMs ?? '—' }}<span v-if="monitor.responseTimeMs !== null" class="ml-1 text-sm text-muted">ms</span></p><p class="mt-1 text-xs text-muted">Most recent successful probe</p></article>
      <article class="surface p-5"><p class="eyebrow">Check policy</p><p class="mt-3 font-mono text-2xl font-medium">{{ formatInterval(monitor.intervalSeconds) }}</p><p class="mt-1 text-xs text-muted">{{ monitor.failureThreshold }} failures before an incident</p></article>
    </section>

    <section v-if="monitor.type === 'ssl'" class="surface mb-5 overflow-hidden">
      <div class="flex flex-col justify-between gap-4 border-b border-line px-5 py-4 sm:flex-row sm:items-center"><div><h2 class="flex items-center gap-2 text-sm font-bold"><ShieldCheck :size="17" class="text-up" /> Certificate health</h2><p class="mt-1 text-xs text-muted">Public certificate presented by the target endpoint</p></div><span class="font-mono text-sm text-up">{{ certificate.daysRemaining }} days remaining</span></div>
      <div class="grid gap-5 px-5 py-5 sm:grid-cols-2 lg:grid-cols-4">
        <div><p class="eyebrow">Issuer</p><p class="mt-2 text-sm font-semibold">{{ certificate.issuer }}</p></div>
        <div><p class="eyebrow">Valid until</p><p class="mt-2 data-mono">{{ formatDateTime(certificate.validTo) }}</p></div>
        <div><p class="eyebrow">Hostname</p><p class="mt-2 flex items-center gap-1.5 text-sm font-semibold text-up"><Check :size="15" /> Matches</p></div>
        <div><p class="eyebrow">Certificate chain</p><p class="mt-2 flex items-center gap-1.5 text-sm font-semibold text-up"><Check :size="15" /> Valid</p></div>
      </div>
    </section>

    <section class="surface mb-5 p-5 sm:p-6">
      <div class="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div><p class="eyebrow">Availability</p><p class="mt-2 font-mono text-3xl font-medium tracking-tight">{{ uptime.toFixed(2) }}%</p></div>
        <div class="flex rounded-lg border border-line bg-canvas p-1">
          <button v-for="option in ['24h', '7d', '30d'] as const" :key="option" class="rounded-md px-3 py-1.5 font-mono text-[11px]" :class="range === option ? 'bg-white font-medium shadow-sm' : 'text-muted'" @click="range = option">{{ option === '24h' ? '24 hours' : option === '7d' ? '7 days' : '30 days' }}</button>
        </div>
      </div>
      <HeartbeatBar v-if="monitor.lastCheckAt" :monitor="monitor" :count="64" />
      <div v-else class="flex h-7 items-center rounded-lg border border-dashed border-line bg-canvas px-3 font-mono text-[11px] text-muted">Waiting for first scheduled check</div>
      <div v-if="monitor.lastCheckAt" class="mt-2 flex justify-between font-mono text-[10px] text-muted"><span>Start of period</span><span>Now</span></div>
    </section>

    <section v-if="results.length" class="surface mb-5 p-5 sm:p-6"><ResponseChart :results="results" /></section>
    <section v-else class="surface mb-5 p-5 sm:p-6">
      <div class="flex min-h-44 flex-col items-center justify-center text-center"><p class="eyebrow mb-2">Response history</p><h2 class="text-sm font-bold">No checks have completed yet</h2><p class="mt-2 max-w-md text-sm leading-6 text-muted">The response-time trend appears after the first successful probe.</p></div>
    </section>

    <section class="surface overflow-hidden">
      <div class="border-b border-line px-5 py-4"><h2 class="text-sm font-bold">Incident history</h2><p class="mt-0.5 text-xs text-muted">Failures and recovery confirmations for this monitor</p></div>
      <div v-if="incidents.length">
        <div v-for="incident in incidents" :key="incident.id" class="grid gap-3 border-b border-line/70 px-5 py-4 last:border-0 sm:grid-cols-[auto_1fr_auto] sm:items-center">
          <span class="flex size-8 items-center justify-center rounded-lg" :class="incident.status === 'ongoing' ? 'bg-down/8 text-down' : 'bg-up/8 text-up'"><X v-if="incident.status === 'ongoing'" :size="15" /><Check v-else :size="15" /></span>
          <div><p class="text-sm font-semibold">{{ incident.cause }}</p><p class="mt-1 flex items-center gap-1.5 text-xs text-muted"><Clock3 :size="12" />{{ formatDateTime(incident.startedAt) }}</p></div>
          <span class="data-mono text-muted">{{ formatDuration(incident.durationSeconds) }}</span>
        </div>
      </div>
      <EmptyState v-else title="No incidents recorded" description="This monitor has not crossed its failure threshold." />
    </section>

    <AppModal v-if="editing" :title="`Edit ${monitor.name}`" description="Changes apply to the next scheduled check." @close="editing = false"><MonitorForm :monitor="monitor" @saved="editing = false" @cancel="editing = false" /></AppModal>
    <AppModal v-if="deleting" title="Delete monitor?" description="This also removes its mock incident history." @close="deleting = false">
      <div class="p-6"><p class="text-sm leading-6 text-muted"><strong class="text-ink">{{ monitor.name }}</strong> will stop being checked immediately. This action cannot be undone.</p><div class="mt-6 flex justify-end gap-2"><button class="button-secondary" @click="deleting = false">Cancel</button><button class="button-primary !bg-down" @click="deleteMonitor(monitor.id); router.push('/monitors')">Delete monitor</button></div></div>
    </AppModal>
  </div>
  <EmptyState v-else title="Monitor not found" description="It may have been deleted or the link is no longer valid."><RouterLink to="/monitors" class="button-primary">Back to monitors</RouterLink></EmptyState>
</template>
