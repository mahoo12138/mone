<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from '@cormijs/vue/client'
import { ArrowLeft, Check, Clock3, Globe2, Pause, Pencil, Play, Trash2, X, Zap } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import AppModal from '../../components/ui/AppModal.vue'
import ConfirmDialog from '../../components/ui/ConfirmDialog.vue'
import AppTabs from '../../components/ui/AppTabs.vue'
import IconTooltip from '../../components/ui/IconTooltip.vue'
import EmptyState from '../../components/common/EmptyState.vue'
import MonitorTypeBadge from '../../components/common/MonitorTypeBadge.vue'
import StatusBadge from '../../components/common/StatusBadge.vue'
import MonitorForm from '../../components/monitors/MonitorForm.vue'
import ResponseChart from '../../components/charts/ResponseChart.vue'
import HeartbeatBar from '../../components/charts/HeartbeatBar.vue'
import { toast } from '../../composables/useToast'
import { useMone, dataVersion } from '../../composables/useMone'
import { listCheckResults } from '../../services/checkResults'
import { isDemoMode } from '../../services/supabase'
import { createCheckResults } from '../../data/mock'
import type { CheckResult, Monitor } from '../../types'
import { formatDateTime, formatDuration, formatInterval, formatRelativeTime, monitorTarget } from '../../utils/format'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { state, getMonitor, deleteMonitor, toggleMonitor, testMonitor, error } = useMone()
const monitor = computed(() => getMonitor(String(route.params.id)))
const results = ref<CheckResult[]>([])
const resultsLoading = ref(false)
const incidents = computed(() => state.incidents.filter((incident) => incident.monitorId === String(route.params.id)))
const editOpen = ref(false)
const deleteOpen = ref(false)
const testing = ref(false)
const range = ref<'24h' | '7d' | '30d'>('24h')
const rangeOptions = computed(() => [
  { value: '24h' as const, label: t('monitorDetail.range24h') },
  { value: '7d' as const, label: t('monitorDetail.range7d') },
  { value: '30d' as const, label: t('monitorDetail.range30d') },
])
const uptime = computed(() => monitor.value ? ({ '24h': monitor.value.uptime24h, '7d': monitor.value.uptime7d, '30d': monitor.value.uptime30d })[range.value] : 0)

watch([monitor, dataVersion], async () => {
  if (!monitor.value) {
    results.value = []
    return
  }
  if (isDemoMode) {
    results.value = monitor.value.lastCheckAt ? createCheckResults(monitor.value) : []
    return
  }
  // Keep the previous chart visible while a background refresh is in flight.
  if (!results.value.length) resultsLoading.value = true
  try {
    results.value = await listCheckResults(monitor.value.id)
  } catch {
    if (!results.value.length) results.value = []
  } finally {
    resultsLoading.value = false
  }
}, { immediate: true })

function runTest() {
  if (!monitor.value) return
  const target = monitor.value
  testing.value = true
  window.setTimeout(async () => {
    error.value = ''
    await testMonitor(target.id)
    testing.value = false
    if (error.value) return
    toast(t('toasts.testPassed'), { description: t('toasts.testPassedHint', { ms: target.responseTimeMs }) })
  }, 650)
}

async function toggle() {
  if (!monitor.value) return
  const wasActive = monitor.value.status === 'active'
  const name = monitor.value.name
  error.value = ''
  await toggleMonitor(monitor.value.id)
  if (error.value) return
  toast(t(wasActive ? 'toasts.monitorPaused' : 'toasts.monitorResumed', { name }))
}

function saved() {
  editOpen.value = false
  toast(t('toasts.monitorSaved'), { description: t('monitorForm.editHint') })
}

async function remove() {
  if (!monitor.value) return
  const name = monitor.value.name
  error.value = ''
  await deleteMonitor(monitor.value.id)
  if (error.value) return
  toast(t('toasts.monitorDeleted'), { description: name })
  router.push('/monitors')
}
</script>

<template>
  <div v-if="monitor">
    <RouterLink to="/monitors" class="mb-6 inline-flex items-center gap-2 text-xs font-bold text-muted hover:text-ink"><ArrowLeft :size="15" /> {{ t('monitorDetail.allMonitors') }}</RouterLink>
    <header class="mb-7 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
      <div>
        <div class="mb-3 flex flex-wrap items-center gap-2"><MonitorTypeBadge :type="monitor.type" /><StatusBadge :state="monitor.currentState" :paused="monitor.status === 'paused'" /></div>
        <h1 class="text-3xl font-bold tracking-[-0.04em] sm:text-4xl">{{ monitor.name }}</h1>
        <p class="mt-2 flex items-center gap-2 font-mono text-xs text-muted"><Globe2 :size="14" />{{ monitorTarget(monitor) }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button class="button-secondary" :disabled="testing" @click="runTest"><Zap :size="16" :class="{ 'animate-pulse': testing }" />{{ testing ? t('monitorDetail.testing') : t('monitorDetail.test') }}</button>
        <button class="button-secondary" @click="toggle">
          <Pause v-if="monitor.status === 'active'" :size="16" /><Play v-else :size="16" />
          {{ monitor.status === 'active' ? t('monitorDetail.pause') : t('monitorDetail.resume') }}
        </button>
        <button class="button-secondary" @click="editOpen = true"><Pencil :size="16" /> {{ t('monitorDetail.edit') }}</button>
        <IconTooltip :label="t('monitorDetail.deleteAria')">
          <button class="icon-button border-line bg-paper hover:text-down" :aria-label="t('monitorDetail.deleteAria')" @click="deleteOpen = true"><Trash2 :size="16" /></button>
        </IconTooltip>
      </div>
    </header>

    <section class="mb-5 grid gap-3 sm:grid-cols-3">
      <article class="surface p-5">
        <p class="eyebrow">{{ t('monitorDetail.lastCheck') }}</p>
        <p class="mt-3 text-lg font-bold">{{ formatRelativeTime(monitor.lastCheckAt) }}</p>
        <p class="mt-1 text-xs text-muted">{{ formatDateTime(monitor.lastCheckAt) }}</p>
      </article>
      <article class="surface p-5">
        <p class="eyebrow">{{ t('monitorDetail.responseTime') }}</p>
        <p class="mt-3 font-mono text-2xl font-medium">{{ monitor.responseTimeMs ?? '—' }}<span v-if="monitor.responseTimeMs !== null" class="ml-1 text-sm text-muted">{{ t('common.ms') }}</span></p>
        <p class="mt-1 text-xs text-muted">{{ t('monitorDetail.responseTimeHint') }}</p>
      </article>
      <article class="surface p-5">
        <p class="eyebrow">{{ t('monitorDetail.checkPolicy') }}</p>
        <p class="mt-3 font-mono text-2xl font-medium">{{ formatInterval(monitor.intervalSeconds) }}</p>
        <p class="mt-1 text-xs text-muted">{{ t('monitorDetail.failuresBeforeIncident', { count: monitor.failureThreshold }) }}</p>
      </article>
    </section>

    <section class="surface mb-5 p-5 sm:p-6">
      <div class="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div><p class="eyebrow">{{ t('monitorDetail.availability') }}</p><p class="mt-2 font-mono text-3xl font-medium tracking-tight">{{ uptime.toFixed(2) }}%</p></div>
        <AppTabs v-model="range" :options="rangeOptions" :list-label="t('monitorDetail.availability')" />
      </div>
      <HeartbeatBar v-if="monitor.lastCheckAt" :monitor="monitor" :results="results" :count="64" />
      <div v-else class="flex h-7 items-center rounded-lg border border-dashed border-line bg-canvas px-3 font-mono text-[11px] text-muted">{{ t('monitorDetail.waitingForFirstCheck') }}</div>
      <div v-if="monitor.lastCheckAt" class="mt-2 flex justify-between font-mono text-[10px] text-muted"><span>{{ t('time.startOfPeriod') }}</span><span>{{ t('time.now') }}</span></div>
    </section>

    <section v-if="resultsLoading" class="surface mb-5 p-5 sm:p-6"><div class="flex min-h-44 items-center justify-center text-sm text-muted">{{ t('monitorDetail.loadingHistory') }}</div></section>
    <section v-else-if="results.length" class="surface mb-5 p-5 sm:p-6"><ResponseChart :results="results" /></section>
    <section v-else class="surface mb-5 p-5 sm:p-6">
      <div class="flex min-h-44 flex-col items-center justify-center text-center">
        <p class="eyebrow mb-2">{{ t('monitorDetail.responseHistory') }}</p>
        <h2 class="text-sm font-bold">{{ t('monitorDetail.noChecksTitle') }}</h2>
        <p class="mt-2 max-w-md text-sm leading-6 text-muted">{{ t('monitorDetail.noChecksBody') }}</p>
      </div>
    </section>

    <section class="surface overflow-hidden">
      <div class="border-b border-line px-5 py-4"><h2 class="text-sm font-bold">{{ t('monitorDetail.incidentHistory') }}</h2><p class="mt-0.5 text-xs text-muted">{{ t('monitorDetail.incidentHistorySubtitle') }}</p></div>
      <div v-if="incidents.length">
        <div v-for="incident in incidents" :key="incident.id" class="grid gap-3 border-b border-line/70 px-5 py-4 last:border-0 sm:grid-cols-[auto_1fr_auto] sm:items-center">
          <span class="flex size-8 items-center justify-center rounded-lg" :class="incident.status === 'ongoing' ? 'bg-down/8 text-down' : 'bg-up/8 text-up'"><X v-if="incident.status === 'ongoing'" :size="15" /><Check v-else :size="15" /></span>
          <div><p class="text-sm font-semibold">{{ incident.cause }}</p><p class="mt-1 flex items-center gap-1.5 text-xs text-muted"><Clock3 :size="12" />{{ formatDateTime(incident.startedAt) }}</p></div>
          <span class="data-mono text-muted">{{ formatDuration(incident.durationSeconds) }}</span>
        </div>
      </div>
      <EmptyState v-else :title="t('monitorDetail.noIncidentsTitle')" :description="t('monitorDetail.noIncidentsBody')" />
    </section>

    <AppModal v-model:open="editOpen" :title="t('monitorForm.editTitle', { name: monitor.name })" :description="t('monitorForm.editHint')">
      <MonitorForm :monitor="monitor" @saved="saved" @cancel="editOpen = false" />
    </AppModal>

    <ConfirmDialog
      v-model:open="deleteOpen"
      :title="t('deleteDialog.title')"
      :description="t('deleteDialog.body', { name: monitor.name })"
      :confirm-label="t('deleteDialog.confirm')"
      @confirm="remove"
    />
  </div>
  <EmptyState v-else :title="t('monitorDetail.notFoundTitle')" :description="t('monitorDetail.notFoundBody')">
    <RouterLink to="/monitors" class="button-primary">{{ t('monitorDetail.backToMonitors') }}</RouterLink>
  </EmptyState>
</template>
