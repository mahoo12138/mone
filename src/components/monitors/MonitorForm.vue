<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Globe2, Network } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { useMone } from '../../composables/useMone'
import AppSelect from '../ui/AppSelect.vue'
import type { HttpMethod, Monitor, MonitorConfig, MonitorInput, MonitorType } from '../../types'

const props = defineProps<{ monitor?: Monitor }>()
const emit = defineEmits<{ saved: [monitor: Monitor]; cancel: [] }>()
const { t } = useI18n()
const { createMonitor, updateMonitor } = useMone()

const form = reactive({
  name: '',
  type: 'http' as MonitorType,
  url: 'https://',
  method: 'GET' as HttpMethod,
  headers: '',
  body: '',
  expectedStatusCodes: '200',
  timeoutMs: 10000,
  host: '',
  port: 443,
  intervalSeconds: 60,
  failureThreshold: 3,
  successThreshold: 2,
  error: '',
  submitting: false,
})

const types = computed(() => [
  { value: 'http' as const, label: t('monitorType.http.label'), description: t('monitorType.http.description'), icon: Globe2 },
  { value: 'tcp' as const, label: t('monitorType.tcp.label'), description: t('monitorType.tcp.description'), icon: Network },
])

const methods: HttpMethod[] = ['GET', 'POST', 'HEAD', 'PUT', 'PATCH', 'DELETE']
const intervals = computed(() => [
  { value: 30, label: t('monitorForm.intervalSeconds', { seconds: 30 }) },
  { value: 60, label: t('monitorForm.intervalMinute') },
  { value: 120, label: t('monitorForm.intervalMinutes', { count: 2 }) },
  { value: 180, label: t('monitorForm.intervalMinutes', { count: 3 }) },
  { value: 300, label: t('monitorForm.intervalMinutes', { count: 5 }) },
  { value: 600, label: t('monitorForm.intervalMinutes', { count: 10 }) },
  { value: 3600, label: t('monitorForm.intervalHour') },
])

watch(() => props.monitor, (monitor) => {
  form.error = ''
  if (!monitor) return
  form.name = monitor.name
  form.type = monitor.type
  form.intervalSeconds = monitor.intervalSeconds
  form.failureThreshold = monitor.failureThreshold
  form.successThreshold = monitor.successThreshold
  if (monitor.type === 'http' && 'url' in monitor.config) {
    form.url = monitor.config.url
    form.method = monitor.config.method
    form.headers = Object.entries(monitor.config.headers).map(([key, value]) => `${key}: ${value}`).join('\n')
    form.body = monitor.config.body
    form.expectedStatusCodes = monitor.config.expectedStatusCodes.join(', ')
    form.timeoutMs = monitor.config.timeoutMs
  } else if (monitor.type === 'tcp' && 'host' in monitor.config) {
    form.host = monitor.config.host
    form.port = monitor.config.port
    form.timeoutMs = monitor.config.timeoutMs
  }
}, { immediate: true })

function buildConfig(): MonitorConfig {
  if (form.type === 'http') {
    const headers = Object.fromEntries(form.headers.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
      const separator = line.indexOf(':')
      return separator === -1 ? [line, ''] : [line.slice(0, separator).trim(), line.slice(separator + 1).trim()]
    }))
    return {
      url: form.url.trim(), method: form.method, headers, body: form.body,
      expectedStatusCodes: form.expectedStatusCodes.split(',').map((code) => Number(code.trim())).filter((code) => code >= 100 && code <= 599),
      timeoutMs: Number(form.timeoutMs),
    }
  }
  return { host: form.host.trim(), port: Number(form.port), timeoutMs: Number(form.timeoutMs) }
}

async function submit() {
  form.error = ''
  if (!form.name.trim()) {
    form.error = t('monitorForm.errorName')
    return
  }
  if (form.type === 'http') {
    try {
      const url = new URL(form.url)
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error()
    } catch {
      form.error = t('monitorForm.errorUrl')
      return
    }
  } else if (!form.host.trim()) {
    form.error = t('monitorForm.errorHost')
    return
  }

  form.submitting = true
  try {
    const input: MonitorInput = {
      name: form.name.trim(), type: form.type, config: buildConfig(),
      intervalSeconds: Number(form.intervalSeconds), failureThreshold: Number(form.failureThreshold), successThreshold: Number(form.successThreshold),
    }
    const saved = props.monitor ? await updateMonitor(props.monitor.id, input) : await createMonitor(input)
    if (saved) emit('saved', saved)
  } catch (cause) {
    form.error = cause instanceof Error ? cause.message : t('monitorForm.errorSave')
  } finally {
    form.submitting = false
  }
}
</script>

<template>
  <form class="space-y-7 p-6" @submit.prevent="submit">
    <section>
      <p class="eyebrow mb-3">{{ t('monitorForm.sectionType') }}</p>
      <div class="grid gap-2 sm:grid-cols-2">
        <button
          v-for="type in types"
          :key="type.value"
          type="button"
          class="rounded-xl border p-3 text-left"
          :class="form.type === type.value ? 'border-up bg-up/5 ring-1 ring-up' : 'border-line bg-white hover:border-muted'"
          @click="form.type = type.value"
        >
          <component :is="type.icon" :size="19" :class="form.type === type.value ? 'text-up' : 'text-muted'" />
          <span class="mt-3 block text-xs font-bold">{{ type.label }}</span>
          <span class="mt-1 block text-[11px] leading-4 text-muted">{{ type.description }}</span>
        </button>
      </div>
    </section>

    <section>
      <p class="eyebrow mb-3">{{ t('monitorForm.sectionTarget') }}</p>
      <div class="space-y-4">
        <label class="block">
          <span class="field-label">{{ t('monitorForm.displayName') }}</span>
          <input v-model="form.name" class="field" :placeholder="t('monitorForm.displayNamePlaceholder')" autocomplete="off">
        </label>

        <template v-if="form.type === 'http'">
          <label class="block">
            <span class="field-label">{{ t('monitorForm.url') }}</span>
            <input v-model="form.url" class="field font-mono text-xs" :placeholder="t('monitorForm.urlPlaceholder')" spellcheck="false">
          </label>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="block">
              <span class="field-label">{{ t('monitorForm.method') }}</span>
              <AppSelect v-model="form.method" :options="methods.map((method) => ({ value: method, label: method }))" :aria-label="t('monitorForm.method')" />
            </div>
            <label class="block">
              <span class="field-label">{{ t('monitorForm.expectedStatusCodes') }}</span>
              <input v-model="form.expectedStatusCodes" class="field font-mono text-xs" :placeholder="t('monitorForm.expectedStatusCodesPlaceholder')">
            </label>
          </div>
          <label class="block">
            <span class="field-label">{{ t('monitorForm.headers') }} <span class="font-normal text-muted">{{ t('monitorForm.headersHint') }}</span></span>
            <textarea v-model="form.headers" class="field min-h-20 resize-y font-mono text-xs" :placeholder="t('monitorForm.headersPlaceholder')" spellcheck="false" />
          </label>
          <label v-if="!['GET', 'HEAD'].includes(form.method)" class="block">
            <span class="field-label">{{ t('monitorForm.requestBody') }} <span class="font-normal text-muted">{{ t('monitorForm.requestBodyHint') }}</span></span>
            <textarea v-model="form.body" class="field min-h-20 resize-y font-mono text-xs" placeholder='{"source":"mone"}' spellcheck="false" />
          </label>
        </template>

        <template v-else>
          <div class="grid gap-4 sm:grid-cols-[1fr_140px]">
            <label class="block">
              <span class="field-label">{{ t('monitorForm.host') }}</span>
              <input v-model="form.host" class="field font-mono text-xs" :placeholder="t('monitorForm.hostPlaceholder')" spellcheck="false">
            </label>
            <label class="block">
              <span class="field-label">{{ t('monitorForm.port') }}</span>
              <input v-model="form.port" type="number" min="1" max="65535" class="field font-mono text-xs">
            </label>
          </div>
        </template>
      </div>
    </section>

    <section>
      <p class="eyebrow mb-3">{{ t('monitorForm.sectionPolicy') }}</p>
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="block">
          <span class="field-label">{{ t('monitorForm.interval') }}</span>
          <AppSelect v-model="form.intervalSeconds" :options="intervals" :aria-label="t('monitorForm.interval')" />
        </div>
        <label class="block">
          <span class="field-label">{{ t('monitorForm.timeout') }}</span>
          <div class="relative">
            <input v-model="form.timeoutMs" type="number" min="1000" max="30000" step="1000" class="field pr-14 font-mono text-xs">
            <span class="absolute right-3 top-2.5 text-xs text-muted">{{ t('common.ms') }}</span>
          </div>
        </label>
        <label class="block">
          <span class="field-label">{{ t('monitorForm.failureThreshold') }}</span>
          <div class="flex items-center gap-3">
            <input v-model="form.failureThreshold" type="number" min="1" max="10" class="field font-mono text-xs">
            <span class="shrink-0 text-xs text-muted">{{ t('monitorForm.failureThresholdHint') }}</span>
          </div>
        </label>
        <label class="block">
          <span class="field-label">{{ t('monitorForm.successThreshold') }}</span>
          <div class="flex items-center gap-3">
            <input v-model="form.successThreshold" type="number" min="1" max="10" class="field font-mono text-xs">
            <span class="shrink-0 text-xs text-muted">{{ t('monitorForm.successThresholdHint') }}</span>
          </div>
        </label>
      </div>
    </section>

    <p v-if="form.error" class="rounded-xl border border-down/20 bg-down/5 px-4 py-3 text-sm text-down" role="alert">{{ form.error }}</p>
    <div class="flex items-center justify-end gap-2 border-t border-line pt-5">
      <button type="button" class="button-secondary" @click="emit('cancel')">{{ t('common.cancel') }}</button>
      <button type="submit" class="button-primary" :disabled="form.submitting">
        {{ monitor ? (form.submitting ? t('monitorForm.saving') : t('monitorForm.save')) : (form.submitting ? t('monitorForm.creating') : t('monitorForm.create')) }}
      </button>
    </div>
  </form>
</template>
