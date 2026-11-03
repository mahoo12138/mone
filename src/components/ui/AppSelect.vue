<script setup lang="ts" generic="T extends string | number">
import { computed } from 'vue'
import { SelectContent, SelectIcon, SelectItem, SelectItemIndicator, SelectItemText, SelectPortal, SelectRoot, SelectTrigger, SelectValue, SelectViewport } from 'reka-ui'
import { Check, ChevronDown } from '@lucide/vue'

const props = defineProps<{
  options: readonly { value: T; label: string }[]
  ariaLabel?: string
  triggerClass?: string
}>()
const model = defineModel<T>({ required: true })
// SelectValue reads the label off rendered DOM, which never invalidates on locale change
const selectedLabel = computed(() => props.options.find((option) => option.value === model.value)?.label ?? '')
</script>

<template>
  <SelectRoot v-model="model">
    <SelectTrigger :aria-label="ariaLabel" :class="['field flex items-center justify-between gap-2 text-left', triggerClass]">
      <SelectValue>{{ selectedLabel }}</SelectValue>
      <SelectIcon class="shrink-0 text-muted"><ChevronDown :size="15" /></SelectIcon>
    </SelectTrigger>
    <SelectPortal>
      <SelectContent
        position="popper"
        :side-offset="6"
        class="z-50 overflow-hidden rounded-xl border border-line bg-paper shadow-xl shadow-forest/10"
        style="width: var(--reka-select-trigger-width); max-height: var(--reka-select-content-available-height)"
      >
        <SelectViewport class="p-1">
          <SelectItem
            v-for="option in options"
            :key="String(option.value)"
            :value="option.value"
            class="relative flex cursor-default select-none items-center gap-2 rounded-lg py-2 pl-8 pr-3 text-sm text-ink outline-none data-[disabled]:opacity-40 data-[highlighted]:bg-canvas"
          >
            <SelectItemIndicator class="absolute left-2.5 flex items-center text-up"><Check :size="14" /></SelectItemIndicator>
            <SelectItemText>{{ option.label }}</SelectItemText>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>
