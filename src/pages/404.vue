<script setup lang="ts">
import { RouterLink } from '@cormijs/vue/client'
import { ArrowLeft } from '@lucide/vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="flex min-h-[65vh] flex-col items-center justify-center text-center">
    <p class="font-mono text-7xl font-medium tracking-[-0.08em] text-line">404</p>
    <h1 class="mt-5 text-2xl font-bold tracking-tight">{{ t('notFound.title') }}</h1>
    <p class="mt-2 text-sm text-muted">{{ t('notFound.body') }}</p>
    <RouterLink to="/" class="button-primary mt-6"><ArrowLeft :size="16" /> {{ t('notFound.back') }}</RouterLink>
  </div>
</template>
