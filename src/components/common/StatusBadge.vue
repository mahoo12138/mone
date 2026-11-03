<script setup lang="ts">
import { computed } from 'vue'
import { ArrowDownRight, ArrowUpRight, Minus, Pause } from '@lucide/vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  state: 'up' | 'down' | 'pending'
  paused?: boolean
  compact?: boolean
}>()

const { t } = useI18n()
const label = computed(() => t(props.paused ? 'status.paused' : `status.${props.state}`))
const icon = computed(() => props.paused ? Pause : ({ up: ArrowUpRight, down: ArrowDownRight, pending: Minus })[props.state])
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full border font-semibold"
    :class="[
      compact ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1 text-xs',
      paused ? 'border-line bg-canvas text-muted' : state === 'up' ? 'border-up/20 bg-up/8 text-up' : state === 'down' ? 'border-down/20 bg-down/8 text-down' : 'border-pending/20 bg-pending/10 text-pending',
    ]"
  >
    <component :is="icon" :size="compact ? 12 : 13" :stroke-width="2.2" />
    {{ label }}
  </span>
</template>
