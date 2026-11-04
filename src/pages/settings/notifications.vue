<script setup lang="ts">
import { reactive, ref } from 'vue'
import { BellRing, MessageCircle, Plus, Send, Trash2 } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import PageHeader from '../../components/common/PageHeader.vue'
import AppModal from '../../components/ui/AppModal.vue'
import AppSwitch from '../../components/ui/AppSwitch.vue'
import AppTabs from '../../components/ui/AppTabs.vue'
import IconTooltip from '../../components/ui/IconTooltip.vue'
import EmptyState from '../../components/common/EmptyState.vue'
import { toast } from '../../composables/useToast'
import { useMone } from '../../composables/useMone'
import { sendChannelTest } from '../../services/notifications'
import type { NotificationChannel } from '../../types'

const { state, addChannel, deleteChannel, toggleChannel } = useMone()
const { t } = useI18n()
const addOpen = ref(false)
const actionError = ref('')
const form = reactive({
  name: '',
  type: 'telegram' as NotificationChannel['type'],
  botToken: '',
  chatId: '',
  webhookUrl: '',
  error: '',
})
const channelTypes = [
  { value: 'telegram' as const, label: 'Telegram' },
  { value: 'discord' as const, label: 'Discord' },
]

async function runAction(action: () => Promise<unknown>) {
  actionError.value = ''
  try {
    await action()
    return true
  } catch (cause) {
    actionError.value = cause instanceof Error ? cause.message : t('errors.actionFailed')
    return false
  }
}

async function submit() {
  form.error = ''
  if (!form.name.trim()) {
    form.error = t('notifications.errorName')
    return
  }
  if (form.type === 'telegram' && (!form.botToken || !form.chatId)) {
    form.error = t('notifications.errorTelegram')
    return
  }
  if (form.type === 'discord' && !form.webhookUrl) {
    form.error = t('notifications.errorDiscord')
    return
  }
  const config: Record<string, string> = form.type === 'telegram' ? { bot_token: form.botToken, chat_id: form.chatId } : { webhook_url: form.webhookUrl }
  try {
    const channel = await addChannel({ name: form.name.trim(), type: form.type, config })
    Object.assign(form, { name: '', botToken: '', chatId: '', webhookUrl: '', error: '' })
    addOpen.value = false
    toast(t('toasts.channelAdded'), { description: t('toasts.channelAddedHint', { name: channel.name }) })
  } catch (cause) {
    form.error = cause instanceof Error ? cause.message : t('notifications.errorSave')
  }
}

async function toggle(channel: NotificationChannel) {
  if (!await runAction(() => toggleChannel(channel.id))) return
  toast(t(channel.enabled ? 'toasts.channelEnabled' : 'toasts.channelDisabled', { name: channel.name }))
}

async function remove(channel: NotificationChannel) {
  if (!await runAction(() => deleteChannel(channel.id))) return
  toast(t('toasts.channelDeleted'), { description: channel.name })
}

const testing = ref('')

async function test(channel: NotificationChannel) {
  testing.value = channel.id
  actionError.value = ''
  try {
    await sendChannelTest(channel.id)
    toast(t('toasts.channelTestSent'), { description: channel.name })
  } catch (cause) {
    actionError.value = cause instanceof Error ? cause.message : t('errors.actionFailed')
  } finally {
    testing.value = ''
  }
}
</script>

<template>
  <div class="max-w-5xl">
    <PageHeader :eyebrow="t('notifications.eyebrow')" :title="t('notifications.title')" :description="t('notifications.description')">
      <button class="button-primary" @click="addOpen = true"><Plus :size="17" /> {{ t('notifications.addChannel') }}</button>
    </PageHeader>

    <div class="mb-5 flex items-start gap-3 rounded-xl border border-pending/20 bg-pending/5 px-4 py-3 text-xs leading-5 text-muted">
      <BellRing :size="16" class="mt-0.5 shrink-0 text-pending" />
      <p>{{ t('notifications.demoNotice') }}</p>
    </div>

    <p v-if="actionError" class="mb-4 rounded-xl border border-down/20 bg-down/5 px-4 py-3 text-sm text-down" role="alert">{{ actionError }}</p>

    <section class="surface overflow-hidden">
      <div v-if="state.channels.length">
        <article v-for="channel in state.channels" :key="channel.id" class="flex flex-col gap-4 border-b border-line/70 p-5 last:border-0 sm:flex-row sm:items-center">
          <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-canvas text-muted"><Send v-if="channel.type === 'telegram'" :size="18" /><MessageCircle v-else :size="18" /></span>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-sm font-bold">{{ channel.name }}</h2>
              <span class="rounded-md border border-line px-2 py-0.5 font-mono text-[10px] uppercase text-muted">{{ channel.type }}</span>
            </div>
            <p class="mt-1.5 font-mono text-xs text-muted">{{ channel.target }}</p>
          </div>
          <div class="flex items-center gap-3">
            <button class="button-secondary !px-3 !py-2 text-xs" :disabled="!channel.enabled || testing === channel.id" @click="test(channel)">
              <Send :size="14" /> {{ t(testing === channel.id ? 'notifications.sending' : 'notifications.test') }}
            </button>
            <AppSwitch
              :model-value="channel.enabled"
              :aria-label="t(channel.enabled ? 'notifications.disable' : 'notifications.enable', { name: channel.name })"
              @update:model-value="toggle(channel)"
            />
            <IconTooltip :label="t('notifications.delete', { name: channel.name })">
              <button class="icon-button hover:text-down" :aria-label="t('notifications.delete', { name: channel.name })" @click="remove(channel)"><Trash2 :size="16" /></button>
            </IconTooltip>
          </div>
        </article>
      </div>
      <EmptyState v-else :title="t('notifications.emptyTitle')" :description="t('notifications.emptyBody')">
        <button class="button-primary" @click="addOpen = true"><Plus :size="16" /> {{ t('notifications.addChannel') }}</button>
      </EmptyState>
    </section>

    <AppModal v-model:open="addOpen" :title="t('notifications.dialogTitle')" :description="t('notifications.dialogDescription')">
      <form class="space-y-5 p-6" @submit.prevent="submit">
        <AppTabs v-model="form.type" :options="channelTypes" equal-width :list-label="t('notifications.addChannel')" />
        <label class="block"><span class="field-label">{{ t('notifications.channelName') }}</span><input v-model="form.name" class="field" :placeholder="t('notifications.channelNamePlaceholder')"></label>
        <template v-if="form.type === 'telegram'">
          <label class="block"><span class="field-label">{{ t('notifications.botToken') }}</span><input v-model="form.botToken" type="password" class="field font-mono text-xs" autocomplete="off"></label>
          <label class="block"><span class="field-label">{{ t('notifications.chatId') }}</span><input v-model="form.chatId" class="field font-mono text-xs" autocomplete="off"></label>
        </template>
        <label v-else class="block"><span class="field-label">{{ t('notifications.webhookUrl') }}</span><input v-model="form.webhookUrl" type="password" class="field font-mono text-xs" autocomplete="off"></label>
        <p v-if="form.error" class="text-sm text-down" role="alert">{{ form.error }}</p>
        <div class="flex justify-end gap-2 border-t border-line pt-5">
          <button type="button" class="button-secondary" @click="addOpen = false">{{ t('common.cancel') }}</button>
          <button class="button-primary">{{ t('notifications.addChannel') }}</button>
        </div>
      </form>
    </AppModal>
  </div>
</template>
