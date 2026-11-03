<script setup lang="ts">
import { ToastClose, ToastDescription, ToastRoot, ToastTitle, useToastManager } from 'reka-ui'
import { CircleAlert, CircleCheck, X } from '@lucide/vue'
import { useI18n } from 'vue-i18n'

const { toasts } = useToastManager()
const { t } = useI18n()
</script>

<template>
  <ToastRoot
    v-for="item in toasts"
    :key="item.id"
    :toast="item"
    class="toast-root pointer-events-auto flex items-start gap-3 overflow-hidden rounded-xl border border-line bg-paper px-4 py-3 shadow-lg shadow-forest/10"
  >
    <component :is="item.status === 'error' ? CircleAlert : CircleCheck" :size="17" :class="item.status === 'error' ? 'mt-0.5 shrink-0 text-down' : 'mt-0.5 shrink-0 text-up'" />
    <div class="min-w-0 flex-1">
      <ToastTitle class="text-sm font-bold text-ink">{{ item.title }}</ToastTitle>
      <ToastDescription v-if="item.description" class="mt-0.5 text-xs leading-5 text-muted">{{ item.description }}</ToastDescription>
    </div>
    <ToastClose class="icon-button -mr-1.5 -mt-1 size-7" :aria-label="t('a11y.dismissToast')">
      <X :size="14" />
    </ToastClose>
  </ToastRoot>
</template>
