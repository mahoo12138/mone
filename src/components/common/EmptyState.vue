<script setup lang="ts">
import { SearchX } from '@lucide/vue'

defineProps<{ title: string; description: string }>()
</script>

<template>
  <div class="flex flex-col items-center px-6 py-16 text-center">
    <span class="mb-4 flex size-11 items-center justify-center rounded-xl border border-line bg-canvas text-muted"><SearchX :size="20" /></span>
    <h3 class="font-bold">{{ title }}</h3>
    <p class="mt-1 max-w-sm text-sm leading-6 text-muted">{{ description }}</p>
    <div class="mt-5"><slot /></div>
  </div>
</template>
