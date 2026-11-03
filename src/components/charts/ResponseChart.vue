<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CheckResult } from '../../types'

const props = defineProps<{ results: CheckResult[] }>()
const { t } = useI18n()
const width = 800
const height = 230
const padding = { top: 18, right: 16, bottom: 28, left: 46 }

const values = computed(() => props.results.map((result) => result.responseTimeMs ?? 0))
const maxValue = computed(() => Math.max(100, ...values.value) * 1.15)
const points = computed(() => props.results.map((result, index) => ({
  x: padding.left + (index / Math.max(1, props.results.length - 1)) * (width - padding.left - padding.right),
  y: padding.top + (1 - (result.responseTimeMs ?? 0) / maxValue.value) * (height - padding.top - padding.bottom),
  result,
})))
const linePath = computed(() => points.value.map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' '))
const areaPath = computed(() => `${linePath.value} L ${points.value.at(-1)?.x ?? padding.left} ${height - padding.bottom} L ${padding.left} ${height - padding.bottom} Z`)
const average = computed(() => {
  const available = props.results.filter((result) => result.responseTimeMs !== null)
  return available.length ? Math.round(available.reduce((sum, result) => sum + (result.responseTimeMs ?? 0), 0) / available.length) : 0
})
const ticks = computed(() => [0, 0.5, 1].map((ratio) => ({
  y: padding.top + ratio * (height - padding.top - padding.bottom),
  label: `${Math.round(maxValue.value * (1 - ratio))}ms`,
})))
</script>

<template>
  <div>
    <div class="mb-4 flex items-center justify-between">
      <div>
        <p class="eyebrow">{{ t('responseChart.average') }}</p>
        <p class="mt-1 font-mono text-2xl font-medium tracking-tight">{{ average }}<span class="ml-1 text-sm text-muted">{{ t('common.ms') }}</span></p>
      </div>
      <span class="flex items-center gap-2 text-xs text-muted"><span class="h-0.5 w-5 bg-up" /> {{ t('responseChart.series') }}</span>
    </div>
    <svg :viewBox="`0 0 ${width} ${height}`" class="h-auto w-full overflow-visible" role="img" :aria-label="t('responseChart.axisLabel')">
      <defs>
        <linearGradient id="response-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#238554" stop-opacity="0.18" />
          <stop offset="100%" stop-color="#238554" stop-opacity="0" />
        </linearGradient>
      </defs>
      <g v-for="tick in ticks" :key="tick.y">
        <line :x1="padding.left" :x2="width - padding.right" :y1="tick.y" :y2="tick.y" stroke="#dfe3da" stroke-dasharray="3 5" />
        <text :x="padding.left - 10" :y="tick.y + 4" text-anchor="end" fill="#68746c" font-size="10" font-family="IBM Plex Mono">{{ tick.label }}</text>
      </g>
      <path :d="areaPath" fill="url(#response-area)" />
      <path :d="linePath" fill="none" stroke="#238554" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
      <g v-for="point in points.filter((item) => item.result.status === 'down')" :key="point.result.id">
        <circle :cx="point.x" :cy="height - padding.bottom" r="3" fill="#d54d3f" />
      </g>
      <text :x="padding.left" :y="height - 5" fill="#68746c" font-size="10" font-family="IBM Plex Mono">{{ t('responseChart.from24h') }}</text>
      <text :x="width - padding.right" :y="height - 5" text-anchor="end" fill="#68746c" font-size="10" font-family="IBM Plex Mono">{{ t('responseChart.now') }}</text>
    </svg>
  </div>
</template>
