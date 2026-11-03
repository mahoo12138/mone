<script setup lang="ts">
import { RouterLink } from '@cormijs/vue/client'
import { ArrowUpRight, Pencil, Pause, Play, Trash2 } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { toast } from '../../composables/useToast'
import { useMone } from '../../composables/useMone'
import type { Monitor } from '../../types'
import { formatRelativeTime, monitorTarget } from '../../utils/format'
import MonitorTypeBadge from '../common/MonitorTypeBadge.vue'
import StatusBadge from '../common/StatusBadge.vue'
import HeartbeatBar from '../charts/HeartbeatBar.vue'
import IconTooltip from '../ui/IconTooltip.vue'

defineProps<{ monitors: Monitor[]; showHeartbeat?: boolean }>()
const emit = defineEmits<{ edit: [monitor: Monitor]; delete: [monitor: Monitor] }>()
const { t } = useI18n()
const { toggleMonitor, error } = useMone()

async function toggle(monitor: Monitor) {
  const wasActive = monitor.status === 'active'
  error.value = ''
  await toggleMonitor(monitor.id)
  if (error.value) return
  toast(t(wasActive ? 'toasts.monitorPaused' : 'toasts.monitorResumed', { name: monitor.name }))
}
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full min-w-[850px] border-collapse text-left">
      <thead>
        <tr class="border-b border-line text-[11px] uppercase tracking-[0.1em] text-muted">
          <th class="px-5 py-3 font-semibold">{{ t('monitorTable.colMonitor') }}</th>
          <th class="px-4 py-3 font-semibold">{{ t('monitorTable.colStatus') }}</th>
          <th v-if="showHeartbeat" class="w-[180px] px-4 py-3 font-semibold">{{ t('monitorTable.colHeartbeat') }}</th>
          <th class="px-4 py-3 font-semibold">{{ t('monitorTable.colResponse') }}</th>
          <th class="px-4 py-3 font-semibold">{{ t('monitorTable.colUptime') }}</th>
          <th class="px-4 py-3 font-semibold">{{ t('monitorTable.colLastCheck') }}</th>
          <th class="w-[132px] px-4 py-3 text-right font-semibold">{{ t('common.actions') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="monitor in monitors" :key="monitor.id" class="group border-b border-line/70 last:border-0 hover:bg-white/70">
          <td class="px-5 py-4">
            <div class="flex items-center gap-3">
              <MonitorTypeBadge :type="monitor.type" />
              <div class="min-w-0">
                <RouterLink :to="`/monitors/${monitor.id}`" class="flex items-center gap-1.5 text-sm font-bold hover:text-up">
                  {{ monitor.name }}<ArrowUpRight :size="13" class="opacity-0 group-hover:opacity-100" />
                </RouterLink>
                <p class="mt-0.5 max-w-[250px] truncate font-mono text-[11px] text-muted">{{ monitorTarget(monitor) }}</p>
              </div>
            </div>
          </td>
          <td class="px-4 py-4"><StatusBadge :state="monitor.currentState" :paused="monitor.status === 'paused'" compact /></td>
          <td v-if="showHeartbeat" class="px-4 py-4"><HeartbeatBar :monitor="monitor" :count="28" /></td>
          <td class="px-4 py-4 data-mono">{{ monitor.responseTimeMs === null ? '—' : `${monitor.responseTimeMs} ${t('common.ms')}` }}</td>
          <td class="px-4 py-4 data-mono">{{ monitor.uptime24h.toFixed(2) }}%</td>
          <td class="whitespace-nowrap px-4 py-4 text-xs text-muted">{{ formatRelativeTime(monitor.lastCheckAt) }}</td>
          <td class="px-4 py-3">
            <div class="flex items-center justify-end gap-0.5">
              <IconTooltip :label="t(monitor.status === 'active' ? 'monitorTable.pause' : 'monitorTable.resume', { name: monitor.name })">
                <button class="icon-button" :aria-label="t(monitor.status === 'active' ? 'monitorTable.pause' : 'monitorTable.resume', { name: monitor.name })" @click="toggle(monitor)">
                  <Pause v-if="monitor.status === 'active'" :size="15" /><Play v-else :size="15" />
                </button>
              </IconTooltip>
              <IconTooltip :label="t('monitorTable.edit', { name: monitor.name })">
                <button class="icon-button" :aria-label="t('monitorTable.edit', { name: monitor.name })" @click="emit('edit', monitor)"><Pencil :size="15" /></button>
              </IconTooltip>
              <IconTooltip :label="t('monitorTable.delete', { name: monitor.name })">
                <button class="icon-button hover:text-down" :aria-label="t('monitorTable.delete', { name: monitor.name })" @click="emit('delete', monitor)"><Trash2 :size="15" /></button>
              </IconTooltip>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
