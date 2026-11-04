import { reactive, ref } from 'vue'
import { state } from './useMone'
import { createMockMonitors } from '../data/mock'
import { t } from '../i18n'
import { getStatusPage, upsertStatusPage } from '../services/statusPages'
import { isSupabaseConfigured } from '../services/supabase'
import type { StatusPageConfig } from '../types'

const storageKey = 'mone-status-page-v1'

function createSlug() {
  return `status-${crypto.randomUUID().replaceAll('-', '').slice(0, 8)}`
}

function defaultConfig(): StatusPageConfig {
  return {
    enabled: true,
    slug: isSupabaseConfigured ? createSlug() : 'mone-status',
    title: t('statusPage.defaultTitle'),
    description: t('statusPage.defaultDescription'),
    monitorIds: isSupabaseConfigured
      ? state.monitors.map((monitor) => monitor.id)
      : createMockMonitors().map((monitor) => monitor.id),
  }
}

function loadLocalStatusPage(): StatusPageConfig {
  try {
    const saved = localStorage.getItem(storageKey)
    if (saved) return { ...defaultConfig(), ...JSON.parse(saved) } as StatusPageConfig
  } catch {
    // A blocked or invalid local draft should not prevent the status-page UI from opening.
  }
  return defaultConfig()
}

const statusPage = reactive<StatusPageConfig>(loadLocalStatusPage())
export const statusPageLoading = ref(isSupabaseConfigured)
export const statusPageError = ref('')
let initialization: Promise<void> | null = null

async function loadRemoteStatusPage() {
  const remote = await getStatusPage()
  if (remote) {
    Object.assign(statusPage, remote)
    return
  }
  const created = await upsertStatusPage(defaultConfig())
  Object.assign(statusPage, created)
}

export function useStatusPage() {
  function loadStatusPage(force = false) {
    if (!isSupabaseConfigured) {
      statusPageLoading.value = false
      return Promise.resolve()
    }
    if (!initialization || force) {
      initialization = (async () => {
        statusPageLoading.value = true
        statusPageError.value = ''
        try {
          await loadRemoteStatusPage()
        } catch (cause) {
          statusPageError.value = cause instanceof Error ? cause.message : String(cause)
        } finally {
          statusPageLoading.value = false
        }
      })()
    }
    return initialization
  }

  async function saveStatusPage(next: StatusPageConfig) {
    if (!isSupabaseConfigured) {
      Object.assign(statusPage, next, { monitorIds: [...next.monitorIds] })
      try {
        localStorage.setItem(storageKey, JSON.stringify(statusPage))
      } catch {
        // The in-memory configuration remains usable when storage is unavailable.
      }
      return statusPage
    }

    const saved = await upsertStatusPage(next)
    Object.assign(statusPage, saved)
    return saved
  }

  return { statusPage, loading: statusPageLoading, error: statusPageError, loadStatusPage, saveStatusPage }
}
