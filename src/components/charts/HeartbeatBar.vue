<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { createCheckResults } from '../../data/mock'
import { formatDateTime } from '../../utils/format'
import type { CheckResult, Monitor } from '../../types'

type HeartbeatMonitor = Pick<Monitor, 'id' | 'name' | 'status' | 'currentState'>
type HeartbeatCheck = Pick<CheckResult, 'status' | 'checkedAt'>

const props = withDefaults(defineProps<{ monitor: HeartbeatMonitor; results?: HeartbeatCheck[]; count?: number; allowMock?: boolean; animate?: boolean }>(), { count: 32, allowMock: false, animate: false })
const { t } = useI18n()
const bars = computed(() => {
  if (props.results) return props.results.slice(-props.count).map((result, index) => ({ id: index, status: result.status, checkedAt: result.checkedAt }))
  if (props.monitor.currentState === 'pending' || !props.allowMock) {
    return Array.from({ length: props.count }, (_, index) => ({ id: index, status: 'pending' as const, checkedAt: null }))
  }
  return createCheckResults(props.monitor as Monitor, props.count).map((result) => ({
    id: result.id,
    status: result.status,
    checkedAt: result.checkedAt,
  }))
})
</script>

<template>
  <div class="heartbeat-bar flex h-7 items-stretch gap-[2px]" :class="{ 'heartbeat-bar--animated': animate }" :aria-label="t('heartbeat.recentChecks', { count })">
    <span
      v-for="(bar, index) in bars"
      :key="bar.id"
      class="heartbeat-bar__item min-w-[2px] flex-1 rounded-[2px]"
      :class="bar.status === 'up' ? 'bg-up/75 hover:bg-up' : bar.status === 'down' ? 'bg-down' : 'bg-line'"
      :style="{ '--bar-index': index }"
      :title="bar.status === 'pending' ? t('heartbeat.waiting') : `${t(bar.status === 'up' ? 'heartbeat.up' : 'heartbeat.down')} · ${bar.checkedAt ? formatDateTime(bar.checkedAt) : ''}`"
    />
  </div>
</template>

<style scoped>
.heartbeat-bar__item {
  transform-origin: center bottom;
  transition: transform 180ms cubic-bezier(0.23, 1, 0.32, 1), background-color 160ms ease;
}

.heartbeat-bar--animated .heartbeat-bar__item {
  animation: heartbeat-bar-in 480ms cubic-bezier(0.23, 1, 0.32, 1) backwards;
  animation-delay: calc(var(--heartbeat-delay, 0ms) + var(--bar-index) * 9ms);
}

@media (hover: hover) and (pointer: fine) {
  .heartbeat-bar__item:hover {
    transform: scaleY(1.16);
  }
}

@keyframes heartbeat-bar-in {
  from {
    opacity: 0;
    transform: scaleY(0.2);
  }
  to {
    opacity: 1;
    transform: scaleY(1);
  }
}
</style>
