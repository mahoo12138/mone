<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { MonitorType } from '../../types'

defineProps<{ type: MonitorType }>()
const { t } = useI18n()
</script>

<template>
  <span class="inline-flex min-w-12 items-center justify-center rounded-md border border-line bg-canvas px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-wider text-muted">
    {{ t(`monitorType.${type}.short`) }}
  </span>
</template>
