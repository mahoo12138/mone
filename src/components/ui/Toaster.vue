<script setup lang="ts">
import { ToastProvider, ToastViewport } from 'reka-ui'
import { useI18n } from 'vue-i18n'
import { toastManager } from '../../composables/useToast'
import ToastList from './ToastList.vue'

const { t } = useI18n()
</script>

<template>
  <ToastProvider :toast-manager="toastManager" :duration="3600" swipe-direction="right">
    <ToastList />
    <ToastViewport :label="t('a11y.toasts')" class="fixed inset-x-0 bottom-0 z-50 m-auto flex w-full max-w-sm list-none flex-col gap-2 p-4 outline-none sm:inset-x-auto sm:right-0 sm:items-end" />
  </ToastProvider>
</template>
