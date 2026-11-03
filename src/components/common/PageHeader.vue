<script setup lang="ts">
defineProps<{
  eyebrow?: string
  title: string
  description?: string
}>()
</script>

<template>
  <header class="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
    <div>
      <p v-if="eyebrow" class="eyebrow mb-2">{{ eyebrow }}</p>
      <h1 class="text-3xl font-bold tracking-[-0.035em] text-ink sm:text-[34px]">{{ title }}</h1>
      <p v-if="description" class="mt-2 max-w-2xl text-sm leading-6 text-muted">{{ description }}</p>
    </div>
    <div class="flex shrink-0 items-center gap-2">
      <slot />
    </div>
  </header>
</template>
