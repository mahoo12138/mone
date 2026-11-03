<script setup lang="ts">
import { reactive, ref } from 'vue'
import { BellRing, Check, MessageCircle, Plus, Send, Trash2 } from '@lucide/vue'
import PageHeader from '../../components/common/PageHeader.vue'
import AppModal from '../../components/common/AppModal.vue'
import EmptyState from '../../components/common/EmptyState.vue'
import { useMone } from '../../composables/useMone'

const { state, addChannel, deleteChannel, toggleChannel } = useMone()
const adding = ref(false)
const testedId = ref<string>()
const form = reactive({ name: '', type: 'telegram' as 'telegram' | 'discord', botToken: '', chatId: '', webhookUrl: '', error: '' })
function submit() {
  form.error = ''
  if (!form.name.trim()) { form.error = 'Enter a channel name.'; return }
  if (form.type === 'telegram' && (!form.botToken || !form.chatId)) { form.error = 'Enter both a bot token and chat ID.'; return }
  if (form.type === 'discord' && !form.webhookUrl) { form.error = 'Enter a Discord webhook URL.'; return }
  const target = form.type === 'telegram' ? `Chat ID •••• ${form.chatId.slice(-4)}` : `Webhook •••• ${form.webhookUrl.slice(-4)}`
  addChannel({ name: form.name.trim(), type: form.type, target })
  Object.assign(form, { name: '', botToken: '', chatId: '', webhookUrl: '', error: '' })
  adding.value = false
}
function test(id: string) {
  testedId.value = id
  window.setTimeout(() => { if (testedId.value === id) testedId.value = undefined }, 2200)
}
</script>

<template>
  <div class="max-w-5xl">
    <PageHeader eyebrow="Configuration / Alerts" title="Notifications" description="Route downtime, recovery, and certificate alerts to the places your team already uses.">
      <button class="button-primary" @click="adding = true"><Plus :size="17" /> Add channel</button>
    </PageHeader>

    <div class="mb-5 flex items-start gap-3 rounded-xl border border-pending/20 bg-pending/5 px-4 py-3 text-xs leading-5 text-muted">
      <BellRing :size="16" class="mt-0.5 shrink-0 text-pending" />
      <p>Demo mode stores only masked channel labels. Test actions do not send external requests; secure delivery connects after Supabase is configured.</p>
    </div>

    <section class="surface overflow-hidden">
      <div v-if="state.channels.length">
        <article v-for="channel in state.channels" :key="channel.id" class="flex flex-col gap-4 border-b border-line/70 p-5 last:border-0 sm:flex-row sm:items-center">
          <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-canvas text-muted"><Send v-if="channel.type === 'telegram'" :size="18" /><MessageCircle v-else :size="18" /></span>
          <div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-2"><h2 class="text-sm font-bold">{{ channel.name }}</h2><span class="rounded-md border border-line px-2 py-0.5 font-mono text-[10px] uppercase text-muted">{{ channel.type }}</span></div><p class="mt-1.5 font-mono text-xs text-muted">{{ channel.target }}</p></div>
          <div class="flex items-center gap-2">
            <button class="button-secondary !px-3 !py-2 text-xs" :disabled="!channel.enabled" @click="test(channel.id)"><Check v-if="testedId === channel.id" :size="14" class="text-up" /><Send v-else :size="14" />{{ testedId === channel.id ? 'Demo tested' : 'Test' }}</button>
            <button class="relative h-6 w-11 rounded-full" :class="channel.enabled ? 'bg-up' : 'bg-line'" role="switch" :aria-checked="channel.enabled" :aria-label="`Enable ${channel.name}`" @click="toggleChannel(channel.id)"><span class="absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-all" :class="channel.enabled ? 'left-[22px]' : 'left-0.5'" /></button>
            <button class="icon-button hover:text-down" :aria-label="`Delete ${channel.name}`" @click="deleteChannel(channel.id)"><Trash2 :size="16" /></button>
          </div>
        </article>
      </div>
      <EmptyState v-else title="No notification channels" description="Add Telegram or Discord to receive alerts when a monitor changes state."><button class="button-primary" @click="adding = true"><Plus :size="16" /> Add channel</button></EmptyState>
    </section>

    <AppModal v-if="adding" title="Add notification channel" description="Credentials are masked in this local demo." @close="adding = false">
      <form class="space-y-5 p-6" @submit.prevent="submit">
        <div class="grid grid-cols-2 gap-2"><button type="button" class="rounded-xl border px-4 py-3 text-sm font-bold" :class="form.type === 'telegram' ? 'border-up bg-up/5 text-up' : 'border-line'" @click="form.type = 'telegram'">Telegram</button><button type="button" class="rounded-xl border px-4 py-3 text-sm font-bold" :class="form.type === 'discord' ? 'border-up bg-up/5 text-up' : 'border-line'" @click="form.type = 'discord'">Discord</button></div>
        <label class="block"><span class="field-label">Channel name</span><input v-model="form.name" class="field" placeholder="e.g. Ops alerts"></label>
        <template v-if="form.type === 'telegram'"><label class="block"><span class="field-label">Bot token</span><input v-model="form.botToken" type="password" class="field font-mono text-xs" autocomplete="off"></label><label class="block"><span class="field-label">Chat ID</span><input v-model="form.chatId" class="field font-mono text-xs" autocomplete="off"></label></template>
        <label v-else class="block"><span class="field-label">Webhook URL</span><input v-model="form.webhookUrl" type="password" class="field font-mono text-xs" autocomplete="off"></label>
        <p v-if="form.error" class="text-sm text-down" role="alert">{{ form.error }}</p>
        <div class="flex justify-end gap-2 border-t border-line pt-5"><button type="button" class="button-secondary" @click="adding = false">Cancel</button><button class="button-primary">Add channel</button></div>
      </form>
    </AppModal>
  </div>
</template>
