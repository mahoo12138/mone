<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from '@cormijs/vue/client'
import { ArrowUpRight, Check, Clock3, Siren, X } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import PageHeader from '../components/common/PageHeader.vue'
import AppTabs from '../components/ui/AppTabs.vue'
import EmptyState from '../components/common/EmptyState.vue'
import MonitorTypeBadge from '../components/common/MonitorTypeBadge.vue'
import { useMone } from '../composables/useMone'
import { formatDateTime, formatDuration } from '../utils/format'

const { state } = useMone()
const { t } = useI18n()
const filter = ref<'all' | 'ongoing' | 'resolved'>('all')
const options = computed(() => [
  { value: 'all' as const, label: t('incidents.filterAll') },
  { value: 'ongoing' as const, label: t('incidents.ongoing') },
  { value: 'resolved' as const, label: t('incidents.resolved') },
])
const incidents = computed(() => state.incidents.filter((incident) => filter.value === 'all' || incident.status === filter.value))
const ongoing = computed(() => state.incidents.filter((incident) => incident.status === 'ongoing').length)
const resolved = computed(() => state.incidents.filter((incident) => incident.status === 'resolved').length)

function monitorFor(id: string) {
  return state.monitors.find((monitor) => monitor.id === id)
}
function duration(incident: { startedAt: string; durationSeconds: number | null }) {
  return incident.durationSeconds ?? Math.floor((Date.now() - new Date(incident.startedAt).getTime()) / 1000)
}
</script>

<template>
  <div>
    <PageHeader :eyebrow="t('incidents.eyebrow')" :title="t('incidents.title')" :description="t('incidents.description')" />

    <section class="mb-6 grid grid-cols-3 gap-3">
      <article class="surface p-4 sm:p-5"><p class="text-xs font-semibold text-muted">{{ t('incidents.totalEvents') }}</p><p class="mt-3 font-mono text-3xl">{{ state.incidents.length }}</p></article>
      <article class="surface p-4 sm:p-5"><p class="text-xs font-semibold text-muted">{{ t('incidents.ongoing') }}</p><p class="mt-3 font-mono text-3xl text-down">{{ ongoing }}</p></article>
      <article class="surface p-4 sm:p-5"><p class="text-xs font-semibold text-muted">{{ t('incidents.resolved') }}</p><p class="mt-3 font-mono text-3xl text-up">{{ resolved }}</p></article>
    </section>

    <div class="mb-4 sm:w-fit">
      <AppTabs v-model="filter" :options="options" :list-label="t('incidents.title')" />
    </div>

    <section class="surface overflow-hidden">
      <div v-if="incidents.length">
        <article v-for="incident in incidents" :key="incident.id" class="border-b border-line/70 p-5 last:border-0">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start">
            <span class="flex size-10 shrink-0 items-center justify-center rounded-xl" :class="incident.status === 'ongoing' ? 'bg-down/8 text-down' : 'bg-up/8 text-up'"><Siren v-if="incident.status === 'ongoing'" :size="18" /><Check v-else :size="18" /></span>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <RouterLink :to="`/monitors/${incident.monitorId}`" class="flex items-center gap-1 text-sm font-bold hover:text-up">
                  {{ monitorFor(incident.monitorId)?.name ?? t('incidents.deletedMonitor') }}<ArrowUpRight :size="13" />
                </RouterLink>
                <MonitorTypeBadge v-if="monitorFor(incident.monitorId)" :type="monitorFor(incident.monitorId)!.type" />
                <span class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider" :class="incident.status === 'ongoing' ? 'bg-down/8 text-down' : 'bg-up/8 text-up'">{{ t(`status.${incident.status}`) }}</span>
              </div>
              <p class="mt-2 text-sm text-muted">{{ incident.cause }}</p>
              <div class="mt-4 grid gap-3 text-xs sm:grid-cols-3">
                <div><p class="eyebrow">{{ t('incidents.started') }}</p><p class="mt-1.5 flex items-center gap-1.5 text-muted"><Clock3 :size="12" />{{ formatDateTime(incident.startedAt) }}</p></div>
                <div><p class="eyebrow">{{ t('incidents.resolvedAt') }}</p><p class="mt-1.5 text-muted">{{ incident.resolvedAt ? formatDateTime(incident.resolvedAt) : t('time.notYetRecovered') }}</p></div>
                <div><p class="eyebrow">{{ t('incidents.duration') }}</p><p class="mt-1.5 data-mono">{{ formatDuration(duration(incident)) }}</p></div>
              </div>
            </div>
          </div>
        </article>
      </div>
      <EmptyState v-else :title="t('incidents.emptyTitle')" :description="t('incidents.emptyBody')">
        <button class="button-secondary" @click="filter = 'all'">{{ t('incidents.viewAll') }}</button>
      </EmptyState>
    </section>
  </div>
</template>
