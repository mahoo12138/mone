<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, Database, RotateCcw, Save, ShieldCheck } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import PageHeader from '../../components/common/PageHeader.vue'
import AppSelect from '../../components/ui/AppSelect.vue'
import ConfirmDialog from '../../components/ui/ConfirmDialog.vue'
import { toast } from '../../composables/useToast'
import { useMone } from '../../composables/useMone'

const { resetDemo } = useMone()
const { t } = useI18n()
const workspaceName = ref(t('settings.defaultWorkspaceName'))
const timezone = ref('UTC')
const savedFlash = ref(false)
const resetOpen = ref(false)
const timezones = ['UTC', 'Asia/Shanghai', 'America/Los_Angeles', 'Europe/London'].map((value) => ({ value, label: value }))
const retention = computed(() => [
  { label: t('settings.retentionRaw'), value: t('settings.retentionRawValue') },
  { label: t('settings.retentionIncidents'), value: t('settings.retentionIncidentsValue') },
  { label: t('settings.retentionLogs'), value: t('settings.retentionLogsValue') },
])

function save() {
  savedFlash.value = true
  window.setTimeout(() => { savedFlash.value = false }, 1800)
  toast(t('toasts.preferencesSaved'))
}

function reset() {
  resetDemo()
  toast(t('toasts.demoReset'))
}
</script>

<template>
  <div class="max-w-4xl">
    <PageHeader :eyebrow="t('settings.eyebrow')" :title="t('settings.title')" :description="t('settings.description')" />

    <section class="surface mb-5 p-5 sm:p-6">
      <div class="mb-6"><h2 class="text-sm font-bold">{{ t('settings.workspaceTitle') }}</h2><p class="mt-1 text-xs text-muted">{{ t('settings.workspaceSubtitle') }}</p></div>
      <div class="grid gap-5 sm:grid-cols-2">
        <label class="block"><span class="field-label">{{ t('settings.workspaceName') }}</span><input v-model="workspaceName" class="field"></label>
        <div class="block">
          <span class="field-label">{{ t('settings.timezone') }}</span>
          <AppSelect v-model="timezone" :options="timezones" :aria-label="t('settings.timezone')" />
        </div>
      </div>
      <div class="mt-6 flex justify-end">
        <button class="button-primary" @click="save"><Check v-if="savedFlash" :size="16" /><Save v-else :size="16" />{{ savedFlash ? t('common.saved') : t('settings.save') }}</button>
      </div>
    </section>

    <section class="surface mb-5 p-5 sm:p-6">
      <div class="mb-5 flex items-center gap-3">
        <span class="flex size-9 items-center justify-center rounded-lg bg-up/8 text-up"><Database :size="18" /></span>
        <div><h2 class="text-sm font-bold">{{ t('settings.retentionTitle') }}</h2><p class="mt-1 text-xs text-muted">{{ t('settings.retentionSubtitle') }}</p></div>
      </div>
      <div class="grid gap-3 sm:grid-cols-3">
        <div v-for="item in retention" :key="item.label" class="rounded-xl border border-line bg-canvas p-4">
          <p class="eyebrow">{{ item.label }}</p>
          <p class="mt-2 font-mono text-xl">{{ item.value }}</p>
        </div>
      </div>
    </section>

    <section class="surface p-5 sm:p-6">
      <div class="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div class="flex items-center gap-3">
          <span class="flex size-9 items-center justify-center rounded-lg bg-canvas text-muted"><ShieldCheck :size="18" /></span>
          <div><h2 class="text-sm font-bold">{{ t('settings.demoTitle') }}</h2><p class="mt-1 text-xs text-muted">{{ t('settings.demoSubtitle') }}</p></div>
        </div>
        <button class="button-secondary shrink-0" @click="resetOpen = true"><RotateCcw :size="15" /> {{ t('settings.reset') }}</button>
      </div>
    </section>

    <ConfirmDialog
      v-model:open="resetOpen"
      :title="t('settings.resetTitle')"
      :description="t('settings.resetBody')"
      :confirm-label="t('settings.resetConfirm')"
      @confirm="reset"
    />
  </div>
</template>
