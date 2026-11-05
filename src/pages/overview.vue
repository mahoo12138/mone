<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from '@cormijs/vue/client'
import { Activity, ArrowRight, CircleCheckBig, Clock3, Pause, Plus, Radar, Siren } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import PageHeader from '../components/common/PageHeader.vue'
import AppModal from '../components/ui/AppModal.vue'
import ConfirmDialog from '../components/ui/ConfirmDialog.vue'
import EmptyState from '../components/common/EmptyState.vue'
import MonitorTable from '../components/monitors/MonitorTable.vue'
import MonitorForm from '../components/monitors/MonitorForm.vue'
import StatusBadge from '../components/common/StatusBadge.vue'
import { toast } from '../composables/useToast'
import { useMone } from '../composables/useMone'
import type { Monitor } from '../types'
import { formatDuration, formatRelativeTime } from '../utils/format'

const { state, overallUptime, downMonitors, deleteMonitor, error } = useMone()
const { t } = useI18n()
const editing = ref<Monitor>()
const editOpen = ref(false)
const deleting = ref<Monitor>()
const deleteOpen = ref(false)
const stats = computed(() => [
  { label: t('overview.statTotal'), value: state.monitors.length, note: t('overview.statTotalNote'), icon: Radar, tone: 'text-ink bg-canvas' },
  { label: t('overview.statOperational'), value: state.monitors.filter((item) => item.currentState === 'up' && item.status === 'active').length, note: t('overview.statOperationalNote'), icon: CircleCheckBig, tone: 'text-up bg-up/8' },
  { label: t('overview.statDown'), value: downMonitors.value.length, note: downMonitors.value.length ? t('overview.statDownNote') : t('overview.statDownClear'), icon: Siren, tone: 'text-down bg-down/8' },
  { label: t('overview.statPaused'), value: state.monitors.filter((item) => item.status === 'paused').length, note: t('overview.statPausedNote'), icon: Pause, tone: 'text-muted bg-canvas' },
])

function monitorName(id: string) {
  return state.monitors.find((monitor) => monitor.id === id)?.name ?? t('overview.deletedMonitor')
}

function saved() {
  editOpen.value = false
  toast(t('toasts.monitorSaved'), { description: t('monitorForm.editHint') })
}

async function remove() {
  if (!deleting.value) return
  const name = deleting.value.name
  error.value = ''
  await deleteMonitor(deleting.value.id)
  if (error.value) return
  toast(t('toasts.monitorDeleted'), { description: name })
}
</script>

<template>
  <div>
    <PageHeader :eyebrow="t('overview.eyebrow')" :title="t('overview.title')" :description="t('overview.description')">
      <RouterLink to="/monitors/create" class="button-primary"><Plus :size="17" /> {{ t('common.newMonitor') }}</RouterLink>
    </PageHeader>

    <section class="relative mb-5 overflow-hidden rounded-2xl bg-forest px-6 py-6 text-white sm:px-8">
      <div class="absolute inset-y-0 right-0 w-1/2 opacity-30" style="background-image: linear-gradient(rgba(199,243,107,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(199,243,107,.12) 1px, transparent 1px); background-size: 24px 24px; mask-image: linear-gradient(to right, transparent, black);" />
      <div class="relative flex flex-col justify-between gap-7 sm:flex-row sm:items-center">
        <div>
          <div class="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-white/50"><Activity :size="14" class="text-lime" /> {{ t('overview.uptimeLabel') }}</div>
          <div class="mt-3 flex items-end gap-3">
            <span class="font-mono text-5xl font-medium tracking-[-0.06em] sm:text-6xl">{{ overallUptime.toFixed(2) }}<span class="text-2xl text-lime">%</span></span>
          </div>
        </div>
        <div class="flex items-center gap-3 sm:text-right">
          <span class="flex size-11 items-center justify-center rounded-full" :class="downMonitors.length ? 'bg-down/20 text-down' : 'bg-lime/15 text-lime'"><Siren :size="20" /></span>
          <div>
            <p class="text-sm font-bold">{{ downMonitors.length ? t('overview.incidentAlert', { count: downMonitors.length }) : t('overview.allClear') }}</p>
            <p class="mt-1 text-xs text-white/50">{{ downMonitors.length ? t('overview.incidentAlertHint') : t('overview.allClearHint') }}</p>
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
          <h2 class="text-sm font-bold">{{ t('overview.fleetTitle') }}</h2>
          <p class="mt-0.5 text-xs text-muted">{{ t('overview.fleetSubtitle') }}</p>
        </div>
        <RouterLink to="/monitors" class="flex items-center gap-1 text-xs font-bold text-up hover:text-ink">{{ t('common.viewAll') }} <ArrowRight :size="14" /></RouterLink>
      </div>
      <MonitorTable v-if="state.monitors.length" :monitors="state.monitors" show-heartbeat @edit="editing = $event; editOpen = true" @delete="deleting = $event; deleteOpen = true" />
      <EmptyState v-else :title="t('overview.fleetEmptyTitle')" :description="t('overview.fleetEmptyBody')">
        <RouterLink to="/monitors/create" class="button-primary"><Plus :size="16" /> {{ t('common.createMonitor') }}</RouterLink>
      </EmptyState>
    </section>

    <section class="surface overflow-hidden">
      <div class="flex items-center justify-between border-b border-line px-5 py-4">
        <div>
          <h2 class="text-sm font-bold">{{ t('overview.incidentsTitle') }}</h2>
          <p class="mt-0.5 text-xs text-muted">{{ t('overview.incidentsSubtitle') }}</p>
        </div>
        <RouterLink to="/incidents" class="flex items-center gap-1 text-xs font-bold text-up hover:text-ink">{{ t('overview.fullHistory') }} <ArrowRight :size="14" /></RouterLink>
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

    <AppModal v-model:open="editOpen" :title="t('monitorForm.editTitle', { name: editing?.name })" :description="t('monitorForm.editHint')">
      <MonitorForm v-if="editing" :monitor="editing" @saved="saved" @cancel="editOpen = false" />
    </AppModal>

    <ConfirmDialog
      v-model:open="deleteOpen"
      :title="t('deleteDialog.title')"
      :description="t('deleteDialog.body', { name: deleting?.name })"
      :confirm-label="t('deleteDialog.confirm')"
      @confirm="remove"
    />
  </div>
</template>
