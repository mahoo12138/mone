<script setup lang="ts">
import { ConfigProvider, TooltipProvider } from 'reka-ui'
import { currentLocale } from '../../i18n'

defineSlots<{ default?: () => any }>()
</script>

<template>
  <ConfigProvider :locale="currentLocale">
    <TooltipProvider :delay-duration="260" :skip-delay-duration="140">
      <slot />
    </TooltipProvider>
  </ConfigProvider>
</template>
