<script setup lang="ts">
import { RouterLink } from '@cormijs/vue/client'
import { ArrowLeft } from '@lucide/vue'
</script>

<template>
  <div class="flex min-h-[65vh] flex-col items-center justify-center text-center">
    <p class="font-mono text-7xl font-medium tracking-[-0.08em] text-line">404</p>
    <h1 class="mt-5 text-2xl font-bold tracking-tight">This signal is out of range.</h1>
    <p class="mt-2 text-sm text-muted">The page you requested does not exist in this workspace.</p>
    <RouterLink to="/" class="button-primary mt-6"><ArrowLeft :size="16" /> Back to overview</RouterLink>
  </div>
</template>
