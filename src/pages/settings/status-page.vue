<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink } from '@cormijs/vue/client'
import { ArrowUpRight, Check, Copy, Globe2, Save } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import PageHeader from '../../components/common/PageHeader.vue'
import MonitorTypeBadge from '../../components/common/MonitorTypeBadge.vue'
import StatusBadge from '../../components/common/StatusBadge.vue'
import AppSwitch from '../../components/ui/AppSwitch.vue'
import { useMone } from '../../composables/useMone'
import { useStatusPage } from '../../composables/useStatusPage'
import { createMockMonitors } from '../../data/mock'
import { isDemoMode, isSupabaseConfigured } from '../../services/supabase'
import { toast } from '../../composables/useToast'
import type { StatusPageConfig } from '../../types'

const { t } = useI18n()
const { state } = useMone()
const { statusPage, loading, error: remoteError, loadStatusPage, saveStatusPage } = useStatusPage()
const draft = reactive<StatusPageConfig>({ ...statusPage, monitorIds: [...statusPage.monitorIds] })
const demoMonitors = isDemoMode ? createMockMonitors() : []
const saving = ref(false)
const savedFlash = ref(false)
const copied = ref(false)
const formError = ref('')

onMounted(() => { void loadStatusPage() })
watch(statusPage, (value) => {
  Object.assign(draft, value, { monitorIds: [...value.monitorIds] })
}, { deep: true, immediate: true })

const visibleMonitors = computed(() => isSupabaseConfigured ? state.monitors : demoMonitors)
const selectedMonitors = computed(() => visibleMonitors.value.filter((monitor) => draft.monitorIds.includes(monitor.id)))
const issueCount = computed(() => selectedMonitors.value.filter((monitor) => monitor.currentState === 'down' && monitor.status === 'active').length)
const previewUptime = computed(() => selectedMonitors.value.length
  ? selectedMonitors.value.reduce((total, monitor) => total + monitor.uptime30d, 0) / selectedMonitors.value.length
  : 100)
const publicUrl = computed(() => `${window.location.origin}/status/${draft.slug || 'mone-status'}`)

async function save() {
  formError.value = ''
  draft.title = draft.title.trim()
  draft.slug = draft.slug.trim()
  draft.description = draft.description.trim()
  if (!draft.title) {
    formError.value = t('statusPage.errorTitle')
    return
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug)) {
    formError.value = t('statusPage.errorSlug')
    return
  }
  if (!draft.monitorIds.length) {
    formError.value = t('statusPage.errorMonitors')
    return
  }
  saving.value = true
  try {
    await saveStatusPage({ ...draft, monitorIds: [...draft.monitorIds] })
    savedFlash.value = true
    toast(t('toasts.statusPageSaved'))
    window.setTimeout(() => { savedFlash.value = false }, 1800)
  } catch (cause) {
    const code = (cause as { code?: string }).code
    formError.value = code === '23505' ? t('statusPage.errorSlugTaken') : cause instanceof Error ? cause.message : t('errors.actionFailed')
  } finally {
    saving.value = false
  }
}

async function copyUrl() {
  await navigator.clipboard.writeText(publicUrl.value)
  copied.value = true
  window.setTimeout(() => { copied.value = false }, 1800)
}
</script>

<template>
  <div class="max-w-6xl">
    <PageHeader :eyebrow="t('statusPage.eyebrow')" :title="t('statusPage.title')" :description="t('statusPage.description')">
      <RouterLink :to="`/status/${statusPage.slug}`" target="_blank" class="button-secondary">
        {{ t('statusPage.openPublic') }}<ArrowUpRight :size="16" />
      </RouterLink>
      <button class="button-primary" :disabled="saving" @click="save">
        <Check v-if="savedFlash" :size="16" /><Save v-else :size="16" />
        {{ savedFlash ? t('common.saved') : t('statusPage.save') }}
      </button>
    </PageHeader>

    <div v-if="loading" class="surface flex min-h-52 items-center justify-center text-sm text-muted">{{ t('statusPage.loading') }}</div>
    <div v-else-if="remoteError" class="surface flex min-h-52 flex-col items-center justify-center text-center">
      <p class="text-sm font-bold text-down">{{ t('statusPage.loadError') }}</p>
      <p class="mt-2 max-w-md text-sm text-muted">{{ remoteError }}</p>
      <button class="button-secondary mt-5" @click="loadStatusPage(true)">{{ t('app.retry') }}</button>
    </div>
    <div v-else class="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div>
        <section class="surface mb-5 p-5 sm:p-6">
          <div class="flex items-start justify-between gap-5">
            <div class="flex gap-3">
              <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-up/8 text-up"><Globe2 :size="19" /></span>
              <div>
                <h2 class="text-sm font-bold">{{ t('statusPage.publishTitle') }}</h2>
                <p class="mt-1 text-xs leading-5 text-muted">{{ t('statusPage.publishSubtitle') }}</p>
              </div>
            </div>
            <AppSwitch v-model="draft.enabled" :aria-label="t('statusPage.publishTitle')" />
          </div>
          <div class="mt-5 rounded-xl border p-4 transition-colors" :class="draft.enabled ? 'border-up/20 bg-up/5' : 'border-line bg-canvas'">
            <div class="flex items-center gap-2 text-xs font-bold" :class="draft.enabled ? 'text-up' : 'text-muted'">
              <span class="size-2 rounded-full" :class="draft.enabled ? 'bg-up' : 'bg-muted/50'" />
              {{ t(draft.enabled ? 'statusPage.enabled' : 'statusPage.disabled') }}
            </div>
            <p class="mt-1.5 text-xs text-muted">{{ t(draft.enabled ? 'statusPage.enabledHint' : 'statusPage.disabledHint') }}</p>
          </div>
        </section>

        <section class="surface mb-5 p-5 sm:p-6">
          <div class="mb-6">
            <h2 class="text-sm font-bold">{{ t('statusPage.identityTitle') }}</h2>
            <p class="mt-1 text-xs text-muted">{{ t('statusPage.identitySubtitle') }}</p>
          </div>
          <div class="space-y-5">
            <label class="block">
              <span class="field-label">{{ t('statusPage.pageTitle') }}</span>
              <input v-model="draft.title" class="field" :placeholder="t('statusPage.pageTitlePlaceholder')" maxlength="80">
            </label>
            <div>
              <label class="block">
                <span class="field-label">{{ t('statusPage.slug') }}</span>
                <div class="flex overflow-hidden rounded-xl border border-line bg-white focus-within:border-up">
                  <span class="flex items-center border-r border-line bg-canvas px-3 font-mono text-xs text-muted">/status/</span>
                  <input v-model="draft.slug" class="min-w-0 flex-1 bg-transparent px-3.5 py-2.5 font-mono text-sm outline-none" spellcheck="false" maxlength="60" aria-describedby="slug-hint">
                </div>
              </label>
              <p id="slug-hint" class="mt-2 text-[11px] text-muted">{{ t('statusPage.slugHint') }}</p>
            </div>
            <label class="block">
              <span class="field-label">{{ t('statusPage.descriptionLabel') }}</span>
              <textarea v-model="draft.description" class="field resize-none" rows="3" :placeholder="t('statusPage.descriptionPlaceholder')" maxlength="240" />
            </label>
            <div>
              <span class="field-label">{{ t('statusPage.publicUrl') }}</span>
              <div class="flex flex-col gap-2 sm:flex-row">
                <div class="min-w-0 flex-1 truncate rounded-xl border border-line bg-canvas px-3.5 py-2.5 font-mono text-xs text-muted">{{ publicUrl }}</div>
                <button class="button-secondary shrink-0 !py-2" @click="copyUrl">
                  <Check v-if="copied" :size="15" /><Copy v-else :size="15" />
                  {{ t(copied ? 'statusPage.copied' : 'statusPage.copy') }}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section class="surface overflow-hidden">
          <div class="flex items-start justify-between gap-4 border-b border-line px-5 py-5 sm:px-6">
            <div>
              <h2 class="text-sm font-bold">{{ t('statusPage.monitorsTitle') }}</h2>
              <p class="mt-1 max-w-lg text-xs leading-5 text-muted">{{ t('statusPage.monitorsSubtitle') }}</p>
            </div>
            <span class="shrink-0 rounded-full bg-canvas px-2.5 py-1 font-mono text-[11px] text-muted">{{ t('statusPage.selectedCount', { count: draft.monitorIds.length }) }}</span>
          </div>
          <div v-if="visibleMonitors.length" class="divide-y divide-line/70">
            <label v-for="monitor in visibleMonitors" :key="monitor.id" class="flex cursor-pointer items-center gap-3 px-5 py-4 hover:bg-canvas/60 sm:px-6">
              <input v-model="draft.monitorIds" type="checkbox" :value="monitor.id" class="size-4 shrink-0 accent-up">
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="truncate text-sm font-semibold">{{ monitor.name }}</span>
                  <MonitorTypeBadge :type="monitor.type" />
                </div>
              </div>
              <StatusBadge :state="monitor.currentState" :paused="monitor.status === 'paused'" compact />
            </label>
          </div>
          <p v-else class="px-6 py-10 text-center text-sm text-muted">{{ t('statusPage.noMonitors') }}</p>
        </section>

        <p v-if="formError" class="mt-4 rounded-xl border border-down/20 bg-down/5 px-4 py-3 text-sm text-down" role="alert">{{ formError }}</p>
      </div>

      <aside class="xl:sticky xl:top-6">
        <div class="mb-3 flex items-center justify-between px-1">
          <div>
            <p class="eyebrow">{{ t('statusPage.preview') }}</p>
            <p class="mt-1 text-[11px] text-muted">{{ t('statusPage.previewHint') }}</p>
          </div>
          <span class="size-2 rounded-full" :class="draft.enabled ? 'bg-up' : 'bg-line'" />
        </div>
        <div class="overflow-hidden rounded-2xl border border-forest/10 bg-paper shadow-[0_20px_60px_-32px_rgba(20,39,29,0.45)]">
          <div class="flex h-9 items-center gap-1.5 border-b border-line bg-canvas px-4">
            <span class="size-1.5 rounded-full bg-line" /><span class="size-1.5 rounded-full bg-line" /><span class="size-1.5 rounded-full bg-line" />
            <span class="ml-2 truncate font-mono text-[9px] text-muted">/status/{{ draft.slug || 'mone-status' }}</span>
          </div>
          <div class="p-5">
            <div class="flex items-center gap-2">
              <span class="flex size-7 items-center justify-center rounded-lg bg-forest text-[10px] font-bold text-lime">{{ draft.title.charAt(0) || 'M' }}</span>
              <p class="truncate text-xs font-extrabold tracking-tight">{{ draft.title || t('statusPage.defaultTitle') }}</p>
            </div>
            <div class="mt-5 rounded-xl p-4" :class="issueCount ? 'bg-down/7 text-down' : 'bg-up/7 text-up'">
              <div class="flex items-center gap-2 text-xs font-bold">
                <span class="size-2 rounded-full" :class="issueCount ? 'bg-down' : 'bg-up'" />
                {{ issueCount ? t('statusPage.previewIssues', { count: issueCount }) : t('statusPage.previewOperational') }}
              </div>
              <p class="mt-2 font-mono text-[9px] uppercase tracking-wider opacity-70">{{ t('statusPage.previewUptime') }}</p>
              <p class="mt-1 font-mono text-2xl tracking-tight">{{ previewUptime.toFixed(2) }}%</p>
            </div>
            <div class="mt-5 space-y-3">
              <div v-for="monitor in selectedMonitors.slice(0, 3)" :key="monitor.id">
                <div class="mb-2 flex items-center justify-between gap-3 text-[10px]">
                  <span class="truncate font-semibold">{{ monitor.name }}</span>
                  <span class="font-mono" :class="monitor.currentState === 'down' ? 'text-down' : 'text-up'">{{ monitor.uptime30d.toFixed(2) }}%</span>
                </div>
                <div class="flex h-3 gap-[2px]">
                  <span v-for="index in 18" :key="index" class="flex-1 rounded-[1px]" :class="monitor.currentState === 'down' && index > 15 ? 'bg-down' : monitor.currentState === 'pending' ? 'bg-line' : 'bg-up/65'" />
                </div>
              </div>
              <p v-if="selectedMonitors.length > 3" class="pt-1 text-center font-mono text-[9px] text-muted">{{ t('statusPage.previewMore', { count: selectedMonitors.length - 3 }) }}</p>
              <p v-if="!selectedMonitors.length" class="py-5 text-center text-[11px] text-muted">{{ t('statusPage.emptyTitle') }}</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>
