<script setup lang="ts">
import { TooltipContent, TooltipPortal, TooltipRoot, TooltipTrigger } from 'reka-ui'

defineProps<{ label: string; side?: 'top' | 'right' | 'bottom' | 'left' }>()
defineSlots<{ default?: () => any }>()
</script>

<template>
  <TooltipRoot>
    <TooltipTrigger as-child>
      <slot />
    </TooltipTrigger>
    <TooltipPortal>
      <TooltipContent
        :side="side ?? 'top'"
        :side-offset="8"
        class="z-50 rounded-md bg-forest px-2.5 py-1.5 text-xs font-medium text-white shadow-lg"
      >
        {{ label }}
      </TooltipContent>
    </TooltipPortal>
  </TooltipRoot>
</template>
