<script setup lang="ts">
import { X } from '@lucide/vue'

defineProps<{ title: string; description?: string }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="body">
    <Transition name="modal" appear>
      <div class="fixed inset-0 z-50 flex items-end justify-center bg-forest/45 p-0 backdrop-blur-[3px] sm:items-center sm:p-6" @mousedown.self="emit('close')">
        <section class="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-line bg-paper shadow-2xl sm:rounded-2xl" role="dialog" aria-modal="true" :aria-label="title">
          <div class="sticky top-0 z-10 flex items-start justify-between border-b border-line bg-paper/95 px-6 py-5 backdrop-blur">
            <div>
              <h2 class="text-xl font-bold tracking-tight">{{ title }}</h2>
              <p v-if="description" class="mt-1 text-sm text-muted">{{ description }}</p>
            </div>
            <button class="icon-button -mr-2 -mt-1" aria-label="Close dialog" @click="emit('close')"><X :size="19" /></button>
          </div>
          <slot />
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
