<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from '@cormijs/vue/client'
import { ArrowUpRight, Check, Clock3, Siren, X } from '@lucide/vue'
import PageHeader from '../components/common/PageHeader.vue'
import EmptyState from '../components/common/EmptyState.vue'
import MonitorTypeBadge from '../components/common/MonitorTypeBadge.vue'
import { useMone } from '../composables/useMone'
import { formatDateTime, formatDuration } from '../utils/format'

const { state } = useMone()
const filter = ref<'all' | 'ongoing' | 'resolved'>('all')
const incidents = computed(() => state.incidents.filter((incident) => filter.value === 'all' || incident.status === filter.value))
const ongoing = computed(() => state.incidents.filter((incident) => incident.status === 'ongoing').length)
const resolved = computed(() => state.incidents.filter((incident) => incident.status === 'resolved').length)
function monitorFor(id: string) { return state.monitors.find((monitor) => monitor.id === id) }
function duration(incident: { startedAt: string; durationSeconds: number | null }) {
  return incident.durationSeconds ?? Math.floor((Date.now() - new Date(incident.startedAt).getTime()) / 1000)
}
</script>

<template>
  <div>
    <PageHeader eyebrow="Workspace / Timeline" title="Incidents" description="Understand when service degradation started, what caused it, and how quickly it recovered." />

    <section class="mb-6 grid grid-cols-3 gap-3">
      <article class="surface p-4 sm:p-5"><p class="text-xs font-semibold text-muted">Total events</p><p class="mt-3 font-mono text-3xl">{{ state.incidents.length }}</p></article>
      <article class="surface p-4 sm:p-5"><p class="text-xs font-semibold text-muted">Ongoing</p><p class="mt-3 font-mono text-3xl text-down">{{ ongoing }}</p></article>
      <article class="surface p-4 sm:p-5"><p class="text-xs font-semibold text-muted">Resolved</p><p class="mt-3 font-mono text-3xl text-up">{{ resolved }}</p></article>
    </section>

    <div class="mb-4 flex items-center gap-1 rounded-xl border border-line bg-paper p-1 sm:w-fit">
      <button v-for="option in ['all', 'ongoing', 'resolved'] as const" :key="option" class="flex-1 rounded-lg px-4 py-2 text-xs font-bold capitalize sm:flex-none" :class="filter === option ? 'bg-forest text-white' : 'text-muted hover:text-ink'" @click="filter = option">{{ option }}</button>
    </div>

    <section class="surface overflow-hidden">
      <div v-if="incidents.length">
        <article v-for="incident in incidents" :key="incident.id" class="border-b border-line/70 p-5 last:border-0">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start">
            <span class="flex size-10 shrink-0 items-center justify-center rounded-xl" :class="incident.status === 'ongoing' ? 'bg-down/8 text-down' : 'bg-up/8 text-up'"><Siren v-if="incident.status === 'ongoing'" :size="18" /><Check v-else :size="18" /></span>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <RouterLink :to="`/monitors/${incident.monitorId}`" class="flex items-center gap-1 text-sm font-bold hover:text-up">{{ monitorFor(incident.monitorId)?.name ?? 'Deleted monitor' }}<ArrowUpRight :size="13" /></RouterLink>
                <MonitorTypeBadge v-if="monitorFor(incident.monitorId)" :type="monitorFor(incident.monitorId)!.type" />
                <span class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider" :class="incident.status === 'ongoing' ? 'bg-down/8 text-down' : 'bg-up/8 text-up'">{{ incident.status }}</span>
              </div>
              <p class="mt-2 text-sm text-muted">{{ incident.cause }}</p>
              <div class="mt-4 grid gap-3 text-xs sm:grid-cols-3">
                <div><p class="eyebrow">Started</p><p class="mt-1.5 flex items-center gap-1.5 text-muted"><Clock3 :size="12" />{{ formatDateTime(incident.startedAt) }}</p></div>
                <div><p class="eyebrow">Resolved</p><p class="mt-1.5 text-muted">{{ incident.resolvedAt ? formatDateTime(incident.resolvedAt) : 'Not yet recovered' }}</p></div>
                <div><p class="eyebrow">Duration</p><p class="mt-1.5 data-mono">{{ formatDuration(duration(incident)) }}</p></div>
              </div>
            </div>
          </div>
        </article>
      </div>
      <EmptyState v-else title="No incidents here" description="No events match the selected status. Try viewing the full incident history."><button class="button-secondary" @click="filter = 'all'">View all incidents</button></EmptyState>
    </section>
  </div>
</template>
