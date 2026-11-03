<script setup lang="ts">
import { ref } from 'vue'
import { Check, Database, RotateCcw, Save, ShieldCheck } from '@lucide/vue'
import PageHeader from '../../components/common/PageHeader.vue'
import AppModal from '../../components/common/AppModal.vue'
import { useMone } from '../../composables/useMone'

const { resetDemo } = useMone()
const workspaceName = ref('Personal workspace')
const timezone = ref('UTC')
const saved = ref(false)
const confirmingReset = ref(false)
function save() {
  saved.value = true
  window.setTimeout(() => saved.value = false, 1800)
}
function reset() {
  resetDemo()
  confirmingReset.value = false
}
</script>

<template>
  <div class="max-w-4xl">
    <PageHeader eyebrow="Configuration / General" title="Settings" description="Workspace preferences, data policy, and local demo controls." />

    <section class="surface mb-5 p-5 sm:p-6">
      <div class="mb-6"><h2 class="text-sm font-bold">Workspace</h2><p class="mt-1 text-xs text-muted">Basic preferences for this monitoring workspace.</p></div>
      <div class="grid gap-5 sm:grid-cols-2">
        <label><span class="field-label">Workspace name</span><input v-model="workspaceName" class="field"></label>
        <label><span class="field-label">Display timezone</span><select v-model="timezone" class="field"><option>UTC</option><option>Asia/Shanghai</option><option>America/Los_Angeles</option><option>Europe/London</option></select></label>
      </div>
      <div class="mt-6 flex justify-end"><button class="button-primary" @click="save"><Check v-if="saved" :size="16" /><Save v-else :size="16" />{{ saved ? 'Saved' : 'Save preferences' }}</button></div>
    </section>

    <section class="surface mb-5 p-5 sm:p-6">
      <div class="mb-5 flex items-center gap-3"><span class="flex size-9 items-center justify-center rounded-lg bg-up/8 text-up"><Database :size="18" /></span><div><h2 class="text-sm font-bold">Data retention</h2><p class="mt-1 text-xs text-muted">Planned policy for the Supabase-backed release.</p></div></div>
      <div class="grid gap-3 sm:grid-cols-3">
        <div class="rounded-xl border border-line bg-canvas p-4"><p class="eyebrow">Raw checks</p><p class="mt-2 font-mono text-xl">14 days</p></div>
        <div class="rounded-xl border border-line bg-canvas p-4"><p class="eyebrow">Incidents</p><p class="mt-2 font-mono text-xl">Indefinite</p></div>
        <div class="rounded-xl border border-line bg-canvas p-4"><p class="eyebrow">Delivery logs</p><p class="mt-2 font-mono text-xl">30 days</p></div>
      </div>
    </section>

    <section class="surface p-5 sm:p-6">
      <div class="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div class="flex items-center gap-3"><span class="flex size-9 items-center justify-center rounded-lg bg-canvas text-muted"><ShieldCheck :size="18" /></span><div><h2 class="text-sm font-bold">Demo data</h2><p class="mt-1 text-xs text-muted">Restore the original monitors, incidents, and channels.</p></div></div>
        <button class="button-secondary shrink-0" @click="confirmingReset = true"><RotateCcw :size="15" /> Reset demo</button>
      </div>
    </section>

    <AppModal v-if="confirmingReset" title="Reset local demo data?" @close="confirmingReset = false">
      <div class="p-6"><p class="text-sm leading-6 text-muted">All monitor and notification changes stored in this browser will be replaced with the original sample data.</p><div class="mt-6 flex justify-end gap-2"><button class="button-secondary" @click="confirmingReset = false">Cancel</button><button class="button-primary !bg-down" @click="reset">Reset data</button></div></div>
    </AppModal>
  </div>
</template>
