<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from '@cormijs/vue/client'
import { Activity, ArrowRight, CircleCheckBig, Clock3, Pause, Plus, Radar, Siren } from '@lucide/vue'
import PageHeader from '../components/common/PageHeader.vue'
import AppModal from '../components/common/AppModal.vue'
import EmptyState from '../components/common/EmptyState.vue'
import MonitorTable from '../components/monitors/MonitorTable.vue'
import MonitorForm from '../components/monitors/MonitorForm.vue'
import StatusBadge from '../components/common/StatusBadge.vue'
import { useMone } from '../composables/useMone'
import type { Monitor } from '../types'
import { formatDuration, formatRelativeTime } from '../utils/format'

const { state, overallUptime, downMonitors, deleteMonitor } = useMone()
const editing = ref<Monitor>()
const deleting = ref<Monitor>()
const stats = computed(() => [
  { label: 'Total monitors', value: state.monitors.length, note: 'Across all check types', icon: Radar, tone: 'text-ink bg-canvas' },
  { label: 'Operational', value: state.monitors.filter((item) => item.currentState === 'up' && item.status === 'active').length, note: 'Responding normally', icon: CircleCheckBig, tone: 'text-up bg-up/8' },
  { label: 'Down', value: downMonitors.value.length, note: downMonitors.value.length ? 'Requires attention' : 'Nothing to investigate', icon: Siren, tone: 'text-down bg-down/8' },
  { label: 'Paused', value: state.monitors.filter((item) => item.status === 'paused').length, note: 'Excluded from checks', icon: Pause, tone: 'text-muted bg-canvas' },
])

function monitorName(id: string) {
  return state.monitors.find((monitor) => monitor.id === id)?.name ?? 'Deleted monitor'
}
</script>

<template>
  <div>
    <PageHeader eyebrow="Workspace / Live" title="Overview" description="A clear view of every service you rely on, from one quiet control room.">
      <RouterLink to="/monitors/create" class="button-primary"><Plus :size="17" /> New monitor</RouterLink>
    </PageHeader>

    <section class="relative mb-5 overflow-hidden rounded-2xl bg-forest px-6 py-6 text-white sm:px-8">
      <div class="absolute inset-y-0 right-0 w-1/2 opacity-30" style="background-image: linear-gradient(rgba(199,243,107,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(199,243,107,.12) 1px, transparent 1px); background-size: 24px 24px; mask-image: linear-gradient(to right, transparent, black);" />
      <div class="relative flex flex-col justify-between gap-7 sm:flex-row sm:items-center">
        <div>
          <div class="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-white/50"><Activity :size="14" class="text-lime" /> Overall uptime · 30 days</div>
          <div class="mt-3 flex items-end gap-3">
            <span class="font-mono text-5xl font-medium tracking-[-0.06em] sm:text-6xl">{{ overallUptime.toFixed(2) }}<span class="text-2xl text-lime">%</span></span>
          </div>
        </div>
        <div class="flex items-center gap-3 sm:text-right">
          <span class="flex size-11 items-center justify-center rounded-full" :class="downMonitors.length ? 'bg-down/20 text-down' : 'bg-lime/15 text-lime'"><Siren :size="20" /></span>
          <div>
            <p class="text-sm font-bold">{{ downMonitors.length ? `${downMonitors.length} active incident` : 'Everything is running smoothly' }}</p>
            <p class="mt-1 text-xs text-white/50">{{ downMonitors.length ? 'An ongoing check failure needs your attention.' : 'No active incidents across your workspace.' }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="mb-8 grid grid-cols-2 gap-3 xl:grid-cols-4">
      <article v-for="stat in stats" :key="stat.label" class="surface p-4 sm:p-5">
        <div class="flex items-start justify-between gap-3">
          <p class="text-xs font-semibold text-muted">{{ stat.label }}</p>
          <span class="flex size-8 items-center justify-center rounded-lg" :class="stat.tone"><component :is="stat.icon" :size="16" /></span>
        </div>
        <p class="mt-4 font-mono text-3xl font-medium tracking-[-0.04em]">{{ stat.value }}</p>
        <p class="mt-1 hidden text-[11px] text-muted sm:block">{{ stat.note }}</p>
      </article>
    </section>

    <section class="surface mb-8 overflow-hidden">
      <div class="flex items-center justify-between border-b border-line px-5 py-4">
        <div>
          <h2 class="text-sm font-bold">Monitor fleet</h2>
          <p class="mt-0.5 text-xs text-muted">Latest status and response across your services</p>
        </div>
        <RouterLink to="/monitors" class="flex items-center gap-1 text-xs font-bold text-up hover:text-ink">View all <ArrowRight :size="14" /></RouterLink>
      </div>
      <MonitorTable v-if="state.monitors.length" :monitors="state.monitors" show-heartbeat @edit="editing = $event" @delete="deleting = $event" />
      <EmptyState v-else title="No monitors yet" description="Create your first monitor to start tracking service availability.">
        <RouterLink to="/monitors/create" class="button-primary"><Plus :size="16" /> Create monitor</RouterLink>
      </EmptyState>
    </section>

    <section class="surface overflow-hidden">
      <div class="flex items-center justify-between border-b border-line px-5 py-4">
        <div>
          <h2 class="text-sm font-bold">Recent incidents</h2>
          <p class="mt-0.5 text-xs text-muted">Failures and recoveries, in one timeline</p>
        </div>
        <RouterLink to="/incidents" class="flex items-center gap-1 text-xs font-bold text-up hover:text-ink">Full history <ArrowRight :size="14" /></RouterLink>
      </div>
      <div v-for="incident in state.incidents.slice(0, 3)" :key="incident.id" class="grid gap-3 border-b border-line/70 px-5 py-4 last:border-0 sm:grid-cols-[auto_1fr_auto] sm:items-center">
        <StatusBadge :state="incident.status === 'ongoing' ? 'down' : 'up'" compact />
        <div>
          <RouterLink :to="`/monitors/${incident.monitorId}`" class="text-sm font-bold hover:text-up">{{ monitorName(incident.monitorId) }}</RouterLink>
          <p class="mt-1 text-xs text-muted">{{ incident.cause }}</p>
        </div>
        <div class="flex items-center gap-5 text-xs text-muted sm:justify-end">
          <span class="flex items-center gap-1.5"><Clock3 :size="13" />{{ formatRelativeTime(incident.startedAt) }}</span>
          <span class="data-mono">{{ incident.durationSeconds === null ? formatDuration(Math.floor((Date.now() - new Date(incident.startedAt).getTime()) / 1000)) : formatDuration(incident.durationSeconds) }}</span>
        </div>
      </div>
    </section>

    <AppModal v-if="editing" :title="`Edit ${editing.name}`" description="Changes apply to the next scheduled check." @close="editing = undefined">
      <MonitorForm :monitor="editing" @saved="editing = undefined" @cancel="editing = undefined" />
    </AppModal>
    <AppModal v-if="deleting" title="Delete monitor?" description="This also removes its mock incident history." @close="deleting = undefined">
      <div class="p-6">
        <p class="text-sm leading-6 text-muted"><strong class="text-ink">{{ deleting.name }}</strong> will stop being checked immediately. This action cannot be undone.</p>
        <div class="mt-6 flex justify-end gap-2"><button class="button-secondary" @click="deleting = undefined">Cancel</button><button class="button-primary !bg-down" @click="deleteMonitor(deleting.id); deleting = undefined">Delete monitor</button></div>
      </div>
    </AppModal>
  </div>
</template>
