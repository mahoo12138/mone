<script setup lang="ts">
import { RouterLink, useRouter } from '@cormijs/vue/client'
import { ArrowLeft } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import MonitorForm from '../../components/monitors/MonitorForm.vue'
import { toast } from '../../composables/useToast'

const router = useRouter()
const { t } = useI18n()

function saved(monitor: { id: string; name: string }) {
  toast(t('toasts.monitorCreated'), { description: t('toasts.monitorCreatedHint', { name: monitor.name }) })
  router.push(`/monitors/${monitor.id}`)
}
</script>

<template>
  <div class="page-narrow">
    <RouterLink to="/monitors" class="mb-6 inline-flex items-center gap-2 text-xs font-bold text-muted hover:text-ink"><ArrowLeft :size="15" /> {{ t('monitorDetail.backToMonitors') }}</RouterLink>
    <header class="mb-6">
      <p class="eyebrow mb-2">{{ t('monitorsPage.createEyebrow') }}</p>
      <h1 class="text-3xl font-bold tracking-[-0.035em]">{{ t('app.pageNames.create') }}</h1>
      <p class="mt-2 text-sm leading-6 text-muted">{{ t('monitorsPage.createHint') }}</p>
    </header>
    <section class="surface">
      <MonitorForm @saved="saved" @cancel="router.push('/monitors')" />
    </section>
  </div>
</template>
