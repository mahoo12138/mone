<script setup lang="ts">
import { RouterLink, useRouter } from '@cormijs/vue/client'
import { ArrowLeft } from '@lucide/vue'
import MonitorForm from '../../components/monitors/MonitorForm.vue'

const router = useRouter()
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <RouterLink to="/monitors" class="mb-6 inline-flex items-center gap-2 text-xs font-bold text-muted hover:text-ink"><ArrowLeft :size="15" /> Back to monitors</RouterLink>
    <header class="mb-6">
      <p class="eyebrow mb-2">Monitors / New</p>
      <h1 class="text-3xl font-bold tracking-[-0.035em]">Create a monitor</h1>
      <p class="mt-2 text-sm leading-6 text-muted">Point Mone at a public service. No agent or server-side installation required.</p>
    </header>
    <section class="surface">
      <MonitorForm @saved="router.push(`/monitors/${$event.id}`)" @cancel="router.push('/monitors')" />
    </section>
  </div>
</template>
