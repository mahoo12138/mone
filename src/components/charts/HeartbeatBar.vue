<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { createCheckResults } from '../../data/mock'
import { formatDateTime } from '../../utils/format'
import type { CheckResult, Monitor } from '../../types'

const props = withDefaults(defineProps<{ monitor: Monitor; results?: CheckResult[]; count?: number }>(), { count: 32 })
const { t } = useI18n()
const bars = computed(() => {
  if (props.results) return props.results.slice(-props.count).map((result) => ({ id: result.id, status: result.status, checkedAt: result.checkedAt }))
  if (props.monitor.currentState === 'pending') {
    return Array.from({ length: props.count }, (_, index) => ({ id: index, status: 'pending' as const, checkedAt: null }))
  }
  return createCheckResults(props.monitor, props.count).map((result) => ({
    id: result.id,
    status: result.status,
    checkedAt: result.checkedAt,
  }))
})
</script>

<template>
  <div class="flex h-7 items-stretch gap-[2px]" :aria-label="t('heartbeat.recentChecks', { count })">
    <span
      v-for="bar in bars"
      :key="bar.id"
      class="min-w-[2px] flex-1 rounded-[2px] transition-transform hover:scale-y-110"
      :class="bar.status === 'up' ? 'bg-up/75 hover:bg-up' : bar.status === 'down' ? 'bg-down' : 'bg-line'"
      :title="bar.status === 'pending' ? t('heartbeat.waiting') : `${t(bar.status === 'up' ? 'heartbeat.up' : 'heartbeat.down')} · ${bar.checkedAt ? formatDateTime(bar.checkedAt) : ''}`"
    />
  </div>
</template>
