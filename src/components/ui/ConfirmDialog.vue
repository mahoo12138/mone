<script setup lang="ts">
import { AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogOverlay, AlertDialogPortal, AlertDialogRoot, AlertDialogTitle } from 'reka-ui'
import { useI18n } from 'vue-i18n'

const open = defineModel<boolean>('open', { required: true })
withDefaults(defineProps<{
  title: string
  description?: string
  confirmLabel: string
  destructive?: boolean
}>(), { destructive: true })
const emit = defineEmits<{ confirm: [] }>()
const { t } = useI18n()
</script>

<template>
  <AlertDialogRoot v-model:open="open">
    <AlertDialogPortal>
      <AlertDialogOverlay class="dialog-overlay fixed inset-0 z-50 bg-forest/45 backdrop-blur-[3px]" />
      <AlertDialogContent
        :aria-label="title"
        class="dialog-content fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border border-line bg-paper p-6 shadow-2xl focus:outline-none sm:inset-0 sm:m-auto sm:h-fit sm:w-full sm:max-w-lg sm:rounded-2xl"
      >
        <AlertDialogTitle class="text-xl font-bold tracking-tight">{{ title }}</AlertDialogTitle>
        <AlertDialogDescription v-if="description" class="mt-2 text-sm leading-6 text-muted">{{ description }}</AlertDialogDescription>
        <div class="mt-6 flex justify-end gap-2">
          <AlertDialogCancel class="button-secondary">{{ t('common.cancel') }}</AlertDialogCancel>
          <AlertDialogAction
            :class="destructive ? 'button-primary !bg-down' : 'button-primary'"
            @click="emit('confirm')"
          >
            {{ confirmLabel }}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialogPortal>
  </AlertDialogRoot>
</template>
