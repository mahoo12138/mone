<script setup lang="ts">
import { DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { X } from '@lucide/vue'
import { useI18n } from 'vue-i18n'

const open = defineModel<boolean>('open', { required: true })
defineProps<{ title: string; description?: string }>()
const { t } = useI18n()
defineSlots<{ default?: () => any }>()
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="dialog-overlay fixed inset-0 z-50 bg-forest/45 backdrop-blur-[3px]" />
      <DialogContent
        :aria-label="title"
        class="dialog-content fixed inset-x-0 bottom-0 z-50 max-h-[92vh] overflow-y-auto rounded-t-3xl border border-line bg-paper shadow-2xl focus:outline-none sm:inset-0 sm:m-auto sm:h-fit sm:w-full sm:max-w-xl sm:rounded-2xl"
      >
        <div class="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-paper/95 px-6 py-5 backdrop-blur">
          <div class="min-w-0">
            <DialogTitle class="text-xl font-bold tracking-tight">{{ title }}</DialogTitle>
            <DialogDescription v-if="description" class="mt-1 text-sm text-muted">{{ description }}</DialogDescription>
          </div>
          <DialogClose class="icon-button -mr-2 -mt-1 shrink-0" :aria-label="t('a11y.closeDialog')">
            <X :size="19" />
          </DialogClose>
        </div>
        <slot />
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
