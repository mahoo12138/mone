<script setup lang="ts">
import { reactive, watch } from 'vue'
import { Globe2, Network, ShieldCheck } from '@lucide/vue'
import { useMone } from '../../composables/useMone'
import type { HttpMethod, Monitor, MonitorConfig, MonitorInput, MonitorType } from '../../types'

const props = defineProps<{ monitor?: Monitor }>()
const emit = defineEmits<{ saved: [monitor: Monitor]; cancel: [] }>()
const { createMonitor, updateMonitor, getMonitor } = useMone()

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
  expiryThresholdDays: 14,
  intervalSeconds: 60,
  failureThreshold: 3,
  successThreshold: 2,
  error: '',
})

const types = [
  { value: 'http' as const, label: 'HTTP / HTTPS', description: 'Request a URL and validate its response.', icon: Globe2 },
  { value: 'tcp' as const, label: 'TCP', description: 'Check whether a host accepts connections.', icon: Network },
  { value: 'ssl' as const, label: 'SSL / TLS', description: 'Track certificate health and expiration.', icon: ShieldCheck },
]

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
  } else if (monitor.type === 'tcp' && 'host' in monitor.config && 'timeoutMs' in monitor.config) {
    form.host = monitor.config.host
    form.port = monitor.config.port
    form.timeoutMs = monitor.config.timeoutMs
  } else if (monitor.type === 'ssl' && 'host' in monitor.config && 'expiryThresholdDays' in monitor.config) {
    form.host = monitor.config.host
    form.port = monitor.config.port
    form.expiryThresholdDays = monitor.config.expiryThresholdDays
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
  if (form.type === 'tcp') return { host: form.host.trim(), port: Number(form.port), timeoutMs: Number(form.timeoutMs) }
  return { host: form.host.trim(), port: Number(form.port), expiryThresholdDays: Number(form.expiryThresholdDays) }
}

function submit() {
  form.error = ''
  if (!form.name.trim()) {
    form.error = 'Give this monitor a recognizable name.'
    return
  }
  if (form.type === 'http') {
    try {
      const url = new URL(form.url)
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error()
    } catch {
      form.error = 'Enter a valid HTTP or HTTPS URL.'
      return
    }
  } else if (!form.host.trim()) {
    form.error = 'Enter the target hostname or IP address.'
    return
  }

  const input: MonitorInput = {
    name: form.name.trim(), type: form.type, config: buildConfig(),
    intervalSeconds: Number(form.intervalSeconds), failureThreshold: Number(form.failureThreshold), successThreshold: Number(form.successThreshold),
  }
  if (props.monitor) {
    updateMonitor(props.monitor.id, input)
    const updated = getMonitor(props.monitor.id)
    if (updated) emit('saved', updated)
  } else {
    emit('saved', createMonitor(input))
  }
}
</script>

<template>
  <form class="space-y-7 p-6" @submit.prevent="submit">
    <section>
      <p class="eyebrow mb-3">01 / Monitor type</p>
      <div class="grid gap-2 sm:grid-cols-3">
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
      <p class="eyebrow mb-3">02 / Target</p>
      <div class="space-y-4">
        <label class="block">
          <span class="field-label">Display name</span>
          <input v-model="form.name" class="field" placeholder="e.g. Production API" autocomplete="off">
        </label>

        <template v-if="form.type === 'http'">
          <label class="block">
            <span class="field-label">URL</span>
            <input v-model="form.url" class="field font-mono text-xs" placeholder="https://example.com/health" spellcheck="false">
          </label>
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="block">
              <span class="field-label">Method</span>
              <select v-model="form.method" class="field"><option v-for="method in ['GET', 'POST', 'HEAD', 'PUT', 'PATCH', 'DELETE']" :key="method">{{ method }}</option></select>
            </label>
            <label class="block">
              <span class="field-label">Expected status codes</span>
              <input v-model="form.expectedStatusCodes" class="field font-mono text-xs" placeholder="200, 204">
            </label>
          </div>
          <label class="block">
            <span class="field-label">Headers <span class="font-normal text-muted">— one per line</span></span>
            <textarea v-model="form.headers" class="field min-h-20 resize-y font-mono text-xs" placeholder="Authorization: Bearer …" spellcheck="false" />
          </label>
          <label v-if="!['GET', 'HEAD'].includes(form.method)" class="block">
            <span class="field-label">Request body <span class="font-normal text-muted">— optional</span></span>
            <textarea v-model="form.body" class="field min-h-20 resize-y font-mono text-xs" placeholder='{"source":"mone"}' spellcheck="false" />
          </label>
        </template>

        <template v-else>
          <div class="grid gap-4 sm:grid-cols-[1fr_140px]">
            <label class="block">
              <span class="field-label">Hostname or IP</span>
              <input v-model="form.host" class="field font-mono text-xs" placeholder="example.com" spellcheck="false">
            </label>
            <label class="block">
              <span class="field-label">Port</span>
              <input v-model="form.port" type="number" min="1" max="65535" class="field font-mono text-xs">
            </label>
          </div>
          <label v-if="form.type === 'ssl'" class="block">
            <span class="field-label">Expiry alert threshold</span>
            <div class="flex items-center gap-3"><input v-model="form.expiryThresholdDays" type="number" min="1" max="365" class="field max-w-32 font-mono text-xs"><span class="text-sm text-muted">days before expiry</span></div>
          </label>
        </template>
      </div>
    </section>

    <section>
      <p class="eyebrow mb-3">03 / Check policy</p>
      <div class="grid gap-4 sm:grid-cols-2">
        <label class="block">
          <span class="field-label">Check interval</span>
          <select v-model="form.intervalSeconds" class="field">
            <option :value="30">Every 30 seconds</option><option :value="60">Every minute</option><option :value="120">Every 2 minutes</option><option :value="180">Every 3 minutes</option><option :value="300">Every 5 minutes</option><option :value="600">Every 10 minutes</option><option :value="3600">Every hour</option>
          </select>
        </label>
        <label v-if="form.type !== 'ssl'" class="block">
          <span class="field-label">Timeout</span>
          <div class="relative"><input v-model="form.timeoutMs" type="number" min="1000" max="30000" step="1000" class="field pr-12 font-mono text-xs"><span class="absolute right-3 top-2.5 text-xs text-muted">ms</span></div>
        </label>
        <label class="block">
          <span class="field-label">Failure threshold</span>
          <div class="flex items-center gap-3"><input v-model="form.failureThreshold" type="number" min="1" max="10" class="field font-mono text-xs"><span class="shrink-0 text-xs text-muted">failed checks</span></div>
        </label>
        <label class="block">
          <span class="field-label">Recovery threshold</span>
          <div class="flex items-center gap-3"><input v-model="form.successThreshold" type="number" min="1" max="10" class="field font-mono text-xs"><span class="shrink-0 text-xs text-muted">successful checks</span></div>
        </label>
      </div>
    </section>

    <p v-if="form.error" class="rounded-xl border border-down/20 bg-down/5 px-4 py-3 text-sm text-down" role="alert">{{ form.error }}</p>
    <div class="flex items-center justify-end gap-2 border-t border-line pt-5">
      <button type="button" class="button-secondary" @click="emit('cancel')">Cancel</button>
      <button type="submit" class="button-primary">{{ monitor ? 'Save changes' : 'Create monitor' }}</button>
    </div>
  </form>
</template>
