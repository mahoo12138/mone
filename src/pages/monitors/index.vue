<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from '@cormijs/vue/client'
import { Plus, Search } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import PageHeader from '../../components/common/PageHeader.vue'
import AppModal from '../../components/ui/AppModal.vue'
import ConfirmDialog from '../../components/ui/ConfirmDialog.vue'
import AppSelect from '../../components/ui/AppSelect.vue'
import EmptyState from '../../components/common/EmptyState.vue'
import MonitorTable from '../../components/monitors/MonitorTable.vue'
import MonitorForm from '../../components/monitors/MonitorForm.vue'
import { toast } from '../../composables/useToast'
import { useMone } from '../../composables/useMone'
import type { Monitor, MonitorState, MonitorType } from '../../types'

const { state, deleteMonitor, error } = useMone()
const { t } = useI18n()
const search = ref('')
const typeFilter = ref<'all' | MonitorType>('all')
const statusFilter = ref<'all' | MonitorState | 'paused'>('all')
const editing = ref<Monitor>()
const editOpen = ref(false)
const deleting = ref<Monitor>()
const deleteOpen = ref(false)

const typeOptions = computed(() => [
  { value: 'all' as const, label: t('monitorsPage.allTypes') },
  { value: 'http' as const, label: t('monitorType.http.short') },
  { value: 'tcp' as const, label: t('monitorType.tcp.short') },
])
const statusOptions = computed(() => [
  { value: 'all' as const, label: t('monitorsPage.allStatuses') },
  { value: 'up' as const, label: t('status.up') },
  { value: 'down' as const, label: t('status.down') },
  { value: 'pending' as const, label: t('status.pending') },
  { value: 'paused' as const, label: t('status.paused') },
])

const filteredMonitors = computed(() => state.monitors.filter((monitor) => {
  const matchesSearch = `${monitor.name} ${JSON.stringify(monitor.config)}`.toLowerCase().includes(search.value.toLowerCase())
  const matchesType = typeFilter.value === 'all' || monitor.type === typeFilter.value
  const matchesStatus = statusFilter.value === 'all' || (statusFilter.value === 'paused' ? monitor.status === 'paused' : monitor.currentState === statusFilter.value && monitor.status === 'active')
  return matchesSearch && matchesType && matchesStatus
}))

const isFiltered = computed(() => Boolean(search.value) || typeFilter.value !== 'all' || statusFilter.value !== 'all')

function resetFilters() {
  search.value = ''
  typeFilter.value = 'all'
  statusFilter.value = 'all'
}

function saved() {
  editOpen.value = false
  toast(t('toasts.monitorSaved'), { description: t('monitorForm.editHint') })
}

async function remove() {
  if (!deleting.value) return
  const name = deleting.value.name
  error.value = ''
  await deleteMonitor(deleting.value.id)
  if (error.value) return
  toast(t('toasts.monitorDeleted'), { description: name })
}
</script>

<template>
  <div>
    <PageHeader :eyebrow="t('monitorsPage.eyebrow')" :title="t('monitorsPage.title')" :description="t('monitorsPage.description')">
      <RouterLink to="/monitors/create" class="button-primary"><Plus :size="17" /> {{ t('common.newMonitor') }}</RouterLink>
    </PageHeader>

    <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      <label class="relative flex-1">
        <Search :size="16" class="absolute left-3.5 top-3 text-muted" />
        <input v-model="search" class="field !pl-10" :placeholder="t('monitorsPage.searchPlaceholder')" :aria-label="t('monitorsPage.searchLabel')">
      </label>
      <div class="grid grid-cols-2 gap-3 sm:flex">
        <AppSelect v-model="typeFilter" :options="typeOptions" :aria-label="t('monitorsPage.filterTypeLabel')" trigger-class="sm:w-36" />
        <AppSelect v-model="statusFilter" :options="statusOptions" :aria-label="t('monitorsPage.filterStatusLabel')" trigger-class="sm:w-40" />
      </div>
    </div>

    <section class="surface overflow-hidden">
      <div class="flex items-center justify-between border-b border-line px-5 py-3">
        <p class="text-xs text-muted">
          <span class="font-mono font-medium text-ink">{{ t('monitorsPage.count', { shown: filteredMonitors.length, total: state.monitors.length }) }}</span>
          <span class="ml-1">{{ t('monitorsPage.countNoun') }}</span>
        </p>
        <button v-if="isFiltered" class="text-xs font-bold text-up" @click="resetFilters">{{ t('common.clearFilters') }}</button>
      </div>
      <MonitorTable v-if="filteredMonitors.length" :monitors="filteredMonitors" show-heartbeat @edit="editing = $event; editOpen = true" @delete="deleting = $event; deleteOpen = true" />
      <EmptyState v-else :title="t('monitorsPage.emptyTitle')" :description="t('monitorsPage.emptyBody')">
        <button class="button-secondary" @click="resetFilters">{{ t('common.clearFilters') }}</button>
      </EmptyState>
    </section>

    <AppModal v-model:open="editOpen" :title="t('monitorForm.editTitle', { name: editing?.name })" :description="t('monitorForm.editHint')">
      <MonitorForm v-if="editing" :monitor="editing" @saved="saved" @cancel="editOpen = false" />
    </AppModal>

    <ConfirmDialog
      v-model:open="deleteOpen"
      :title="t('deleteDialog.title')"
      :description="t('deleteDialog.body', { name: deleting?.name })"
      :confirm-label="t('deleteDialog.confirm')"
      @confirm="remove"
    />
  </div>
</template>
