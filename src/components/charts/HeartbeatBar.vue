<script setup lang="ts">
import { computed } from 'vue'
import { createCheckResults } from '../../data/mock'
import type { Monitor } from '../../types'

const props = withDefaults(defineProps<{ monitor: Monitor; count?: number }>(), { count: 32 })
const bars = computed(() => {
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
  <div class="flex h-7 items-stretch gap-[2px]" :aria-label="`${count} recent checks`">
    <span
      v-for="bar in bars"
      :key="bar.id"
      class="min-w-[2px] flex-1 rounded-[2px] transition-transform hover:scale-y-110"
      :class="bar.status === 'up' ? 'bg-up/75 hover:bg-up' : bar.status === 'down' ? 'bg-down' : 'bg-line'"
      :title="bar.status === 'pending' ? 'Waiting for first check' : `${bar.status === 'up' ? 'Operational' : 'Service unavailable'} · ${bar.checkedAt ? new Date(bar.checkedAt).toLocaleString() : ''}`"
    />
  </div>
</template>
