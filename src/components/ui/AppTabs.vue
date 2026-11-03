<script setup lang="ts" generic="T extends string">
import { TabsList, TabsRoot, TabsTrigger } from 'reka-ui'

defineProps<{
  options: readonly { value: T; label: string }[]
  listLabel?: string
  equalWidth?: boolean
}>()
const model = defineModel<T>({ required: true })
</script>

<template>
  <TabsRoot v-model="model" class="rounded-xl border border-line bg-canvas p-1" :class="equalWidth ? 'grid grid-cols-2' : 'inline-flex'">
    <TabsList :aria-label="listLabel" class="flex gap-1" :class="equalWidth ? 'contents' : ''">
      <TabsTrigger
        v-for="option in options"
        :key="option.value"
        :value="option.value"
        class="flex-1 whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-bold text-muted outline-none transition-colors data-[state=active]:bg-white data-[state=active]:text-ink data-[state=active]:shadow-sm hover:text-ink"
      >
        {{ option.label }}
      </TabsTrigger>
    </TabsList>
  </TabsRoot>
</template>
