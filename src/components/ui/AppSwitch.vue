<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from 'reka-ui'

defineProps<{ disabled?: boolean }>()
const model = defineModel<boolean>({ required: true })
</script>

<template>
  <SwitchRoot
    v-model="model"
    :disabled="disabled"
    class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full bg-line transition-colors data-[state=checked]:bg-up data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"
  >
    <SwitchThumb class="pointer-events-none block size-5 rounded-full bg-white shadow-sm transition-transform data-[state=unchecked]:translate-x-0.5 data-[state=checked]:translate-x-[22px]" />
  </SwitchRoot>
</template>
