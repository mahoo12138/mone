<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from '@cormijs/vue/client'
import { Plus, Search } from '@lucide/vue'
import PageHeader from '../../components/common/PageHeader.vue'
import AppModal from '../../components/common/AppModal.vue'
import EmptyState from '../../components/common/EmptyState.vue'
import MonitorTable from '../../components/monitors/MonitorTable.vue'
import MonitorForm from '../../components/monitors/MonitorForm.vue'
import { useMone } from '../../composables/useMone'
import type { Monitor, MonitorState, MonitorType } from '../../types'

const { state, deleteMonitor } = useMone()
const search = ref('')
const typeFilter = ref<'all' | MonitorType>('all')
const statusFilter = ref<'all' | MonitorState | 'paused'>('all')
const editing = ref<Monitor>()
const deleting = ref<Monitor>()
const filteredMonitors = computed(() => state.monitors.filter((monitor) => {
  const matchesSearch = `${monitor.name} ${JSON.stringify(monitor.config)}`.toLowerCase().includes(search.value.toLowerCase())
  const matchesType = typeFilter.value === 'all' || monitor.type === typeFilter.value
  const matchesStatus = statusFilter.value === 'all' || (statusFilter.value === 'paused' ? monitor.status === 'paused' : monitor.currentState === statusFilter.value && monitor.status === 'active')
  return matchesSearch && matchesType && matchesStatus
}))
</script>

<template>
  <div>
    <PageHeader eyebrow="Workspace / Inventory" title="Monitors" description="Configure targets, check policies, and availability for every service.">
      <RouterLink to="/monitors/create" class="button-primary"><Plus :size="17" /> New monitor</RouterLink>
    </PageHeader>

    <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      <label class="relative flex-1">
        <Search :size="16" class="absolute left-3.5 top-3 text-muted" />
        <input v-model="search" class="field !pl-10" placeholder="Search by name or target…" aria-label="Search monitors">
      </label>
      <div class="grid grid-cols-2 gap-3 sm:flex">
        <select v-model="typeFilter" class="field sm:w-36" aria-label="Filter by type"><option value="all">All types</option><option value="http">HTTP</option><option value="tcp">TCP</option><option value="ssl">SSL</option></select>
        <select v-model="statusFilter" class="field sm:w-40" aria-label="Filter by status"><option value="all">All statuses</option><option value="up">Operational</option><option value="down">Down</option><option value="pending">Pending</option><option value="paused">Paused</option></select>
      </div>
    </div>

    <section class="surface overflow-hidden">
      <div class="flex items-center justify-between border-b border-line px-5 py-3">
        <p class="text-xs text-muted"><span class="font-mono font-medium text-ink">{{ filteredMonitors.length }}</span> of {{ state.monitors.length }} monitors</p>
        <button v-if="search || typeFilter !== 'all' || statusFilter !== 'all'" class="text-xs font-bold text-up" @click="search = ''; typeFilter = 'all'; statusFilter = 'all'">Clear filters</button>
      </div>
      <MonitorTable v-if="filteredMonitors.length" :monitors="filteredMonitors" show-heartbeat @edit="editing = $event" @delete="deleting = $event" />
      <EmptyState v-else title="No matching monitors" description="Try a different search or clear the filters to see your full monitor fleet.">
        <button class="button-secondary" @click="search = ''; typeFilter = 'all'; statusFilter = 'all'">Clear filters</button>
      </EmptyState>
    </section>

    <AppModal v-if="editing" :title="`Edit ${editing.name}`" description="Changes apply to the next scheduled check." @close="editing = undefined">
      <MonitorForm :monitor="editing" @saved="editing = undefined" @cancel="editing = undefined" />
    </AppModal>
    <AppModal v-if="deleting" title="Delete monitor?" description="This also removes its mock incident history." @close="deleting = undefined">
      <div class="p-6">
        <p class="text-sm leading-6 text-muted"><strong class="text-ink">{{ deleting.name }}</strong> will stop being checked immediately. This action cannot be undone.</p>
        <div class="mt-6 flex justify-end gap-2"><button class="button-secondary" @click="deleting = undefined">Cancel</button><button class="button-primary !bg-down" @click="deleteMonitor(deleting.id); deleting = undefined">Delete monitor</button></div>
      </div>
    </AppModal>
  </div>
</template>
