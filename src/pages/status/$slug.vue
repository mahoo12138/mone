<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from '@cormijs/vue/client'
import { Activity, Check, CircleCheckBig, Clock3, Globe, Siren } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import HeartbeatBar from '../../components/charts/HeartbeatBar.vue'
import StatusBadge from '../../components/common/StatusBadge.vue'
import { useStatusPage } from '../../composables/useStatusPage'
import { createCheckResults, createMockIncidents, createMockMonitors } from '../../data/mock'
import { getPublicStatusPage } from '../../services/statusPages'
import { isDemoMode } from '../../services/supabase'
import { currentLocale, localeOptions, setLocale } from '../../i18n'
import { formatDateTime, formatDuration, formatRelativeTime } from '../../utils/format'
import type { PublicStatusMonitor, PublicStatusPage } from '../../types'

const route = useRoute()
const { t } = useI18n()
const { statusPage } = useStatusPage()
const page = ref<PublicStatusPage | null>(null)
const loading = ref(true)
const errorMessage = ref('')
const uptimeDisplay = ref(0)
let uptimeFrame = 0

function animateUptime() {
  cancelAnimationFrame(uptimeFrame)
  const target = overallUptime.value
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    uptimeDisplay.value = target
    return
  }
  const startedAt = performance.now()
  const step = (now: number) => {
    const progress = Math.min((now - startedAt) / 900, 1)
    uptimeDisplay.value = target * (1 - (1 - progress) ** 3)
    if (progress < 1) uptimeFrame = requestAnimationFrame(step)
  }
  uptimeFrame = requestAnimationFrame(step)
}

onBeforeUnmount(() => cancelAnimationFrame(uptimeFrame))

function demoPayload(): PublicStatusPage {
  const selected = createMockMonitors().filter((monitor) => statusPage.monitorIds.includes(monitor.id))
  const monitors: PublicStatusMonitor[] = selected.map((monitor) => ({
    id: monitor.id,
    name: monitor.name,
    type: monitor.type,
    status: monitor.status,
    currentState: monitor.currentState,
    uptime24h: monitor.uptime24h,
    uptime7d: monitor.uptime7d,
    uptime30d: monitor.uptime30d,
    lastCheckAt: monitor.lastCheckAt,
    checks: createCheckResults(monitor, 60).map((result) => ({
      status: result.status,
      checkedAt: result.checkedAt,
    })),
  }))
  const incidents = createMockIncidents().filter((incident) => selected.some((monitor) => monitor.id === incident.monitorId))
  return { title: statusPage.title, description: statusPage.description, monitors, incidents }
}

async function load() {
  loading.value = true
  errorMessage.value = ''
  page.value = null
  uptimeDisplay.value = 0
  const slug = String(route.params.slug ?? '')
  try {
    if (isDemoMode) {
      if (!statusPage.enabled || slug !== statusPage.slug) return
      page.value = demoPayload()
      animateUptime()
      return
    }
    page.value = await getPublicStatusPage(slug)
    if (page.value) animateUptime()
  } catch (cause) {
    errorMessage.value = cause instanceof Error ? cause.message : t('errors.loadFailed')
  } finally {
    loading.value = false
  }
}

const monitors = computed(() => page.value?.monitors ?? [])
const incidents = computed(() => page.value?.incidents ?? [])
const downCount = computed(() => monitors.value.filter((monitor) => monitor.currentState === 'down' && monitor.status === 'active').length)
const overallUptime = computed(() => monitors.value.length
  ? monitors.value.reduce((total, monitor) => total + monitor.uptime30d, 0) / monitors.value.length
  : 100)
const latestCheck = computed(() => monitors.value.reduce<string | null>((latest, monitor) => {
  if (!monitor.lastCheckAt) return latest
  if (!latest || new Date(monitor.lastCheckAt) > new Date(latest)) return monitor.lastCheckAt
  return latest
}, null))

watch(() => route.params.slug, load, { immediate: true })

function monitorName(id: string) {
  return monitors.value.find((monitor) => monitor.id === id)?.name ?? t('incidents.deletedMonitor')
}

function duration(incident: { startedAt: string; durationSeconds: number | null }) {
  return incident.durationSeconds ?? Math.floor((Date.now() - new Date(incident.startedAt).getTime()) / 1000)
}

function monitorRevealDelay(index: number) {
  return 380 + index * 90
}
</script>

<template>
  <div class="status-page min-h-screen bg-canvas">
    <header class="status-reveal relative overflow-hidden border-b border-line bg-paper">
      <div class="status-grid pointer-events-none absolute opacity-60" style="top: -14px; bottom: -14px; right: -28px; width: calc(50% + 28px); background-image: linear-gradient(rgba(35,133,84,.11) 1px, transparent 1px), linear-gradient(90deg, rgba(35,133,84,.11) 1px, transparent 1px); background-size: 28px 28px; mask-image: linear-gradient(to right, transparent, black);" />
      <nav class="relative mx-auto flex h-[76px] max-w-5xl items-center justify-between px-5 sm:px-8">
        <div class="flex min-w-0 items-center gap-3">
          <span class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-forest text-lime"><Activity :size="20" :stroke-width="2.4" /></span>
          <span class="truncate text-sm font-extrabold tracking-[-0.025em]">{{ page?.title ?? t('statusPage.publicEyebrow') }}</span>
        </div>
        <button
          class="icon-button group !w-auto gap-1.5 !px-2.5 active:scale-95"
          :aria-label="t('nav.language')"
          @click="setLocale(currentLocale === 'en' ? 'zh-CN' : 'en')"
        >
          <Globe :size="15" class="transition-transform duration-200 group-hover:rotate-12" />
          <span class="text-xs font-semibold">{{ localeOptions.find((option) => option.value !== currentLocale)?.label }}</span>
        </button>
      </nav>
    </header>

    <main v-if="loading" class="mx-auto flex min-h-[calc(100vh-76px)] max-w-lg items-center justify-center gap-2.5 px-5 text-sm text-muted" role="status">
      <span class="status-dot status-dot--live size-2 bg-up text-up" />
      {{ t('statusPage.loadingPublic') }}
    </main>

    <main v-else-if="errorMessage" class="mx-auto flex min-h-[calc(100vh-76px)] max-w-lg flex-col items-center justify-center px-5 py-16 text-center">
      <span class="mx-auto flex size-14 items-center justify-center rounded-2xl border border-down/20 bg-down/5 text-down"><Siren :size="25" /></span>
      <h1 class="mt-6 text-2xl font-bold tracking-tight">{{ t('statusPage.loadError') }}</h1>
      <p class="mt-3 max-w-md text-sm leading-6 text-muted">{{ errorMessage }}</p>
      <button class="button-secondary mt-6" @click="load">{{ t('app.retry') }}</button>
    </main>

    <main v-else-if="page" class="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
      <div class="mb-8 max-w-2xl">
        <p class="status-reveal eyebrow mb-3" style="--reveal-delay: 0ms">{{ t('statusPage.publicEyebrow') }}</p>
        <h1 class="status-reveal text-3xl font-bold tracking-[-0.045em] sm:text-[42px]" style="--reveal-delay: 70ms">{{ page.title }}</h1>
        <p class="status-reveal mt-3 text-sm leading-6 text-muted sm:text-[15px]" style="--reveal-delay: 140ms">{{ page.description }}</p>
      </div>

      <section class="status-reveal surface mb-5 overflow-hidden" style="--reveal-delay: 200ms">
        <div class="grid lg:grid-cols-[1fr_240px]">
          <div class="flex items-center gap-4 p-5 sm:gap-5 sm:p-7">
            <span
              class="status-emblem relative flex size-12 shrink-0 items-center justify-center rounded-2xl sm:size-14"
              :class="downCount ? 'bg-down/8 text-down' : 'bg-up/8 text-up'"
            >
              <Siren v-if="downCount" :size="25" /><CircleCheckBig v-else :size="27" />
            </span>
            <div>
              <h2 class="text-lg font-bold tracking-[-0.025em] sm:text-xl">{{ t(downCount ? 'statusPage.partialOutage' : 'statusPage.allOperational') }}</h2>
              <p class="mt-1 text-xs leading-5 text-muted sm:text-sm">{{ t(downCount ? 'statusPage.partialOutageBody' : 'statusPage.allOperationalBody', { count: downCount }) }}</p>
              <p class="mt-3 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted"><Clock3 :size="12" />{{ t('statusPage.updated', { time: formatRelativeTime(latestCheck) }) }}</p>
            </div>
          </div>
          <div class="status-uptime relative overflow-hidden bg-forest p-5 text-white sm:p-7 lg:border-l lg:border-forest">
            <div class="status-orb absolute -right-8 -top-10 size-32 rounded-full bg-lime/10 blur-2xl" />
            <div class="status-sheen pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/12 to-transparent" />
            <p class="relative font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">{{ t('statusPage.overallUptime') }}</p>
            <p class="relative mt-3 font-mono text-4xl font-medium tracking-[-0.055em]">{{ uptimeDisplay.toFixed(2) }}<span class="ml-1 text-lg text-lime">%</span></p>
            <p class="relative mt-2 text-xs text-white/45">{{ t('statusPage.uptime30d') }}</p>
          </div>
        </div>
      </section>

      <section class="status-reveal surface mb-5 overflow-hidden" style="--reveal-delay: 300ms">
        <div class="border-b border-line px-5 py-5 sm:px-6">
          <h2 class="text-sm font-bold">{{ t('statusPage.services') }}</h2>
          <p class="mt-1 text-xs text-muted">{{ t('statusPage.servicesSubtitle') }}</p>
        </div>
        <div v-if="monitors.length" class="divide-y divide-line/70">
          <article
            v-for="(monitor, index) in monitors"
            :key="monitor.id"
            class="status-monitor px-5 py-5 sm:px-6"
            :style="{ '--monitor-delay': `${monitorRevealDelay(index)}ms` }"
          >
            <div class="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div class="flex min-w-0 items-center gap-3">
                <span
                  class="status-dot size-2 shrink-0 rounded-full"
                  :class="[
                    monitor.status === 'paused' || monitor.currentState === 'pending' ? 'bg-pending text-pending' : monitor.currentState === 'down' ? 'bg-down text-down' : 'bg-up text-up',
                    { 'status-dot--live': monitor.status === 'active' && monitor.currentState !== 'pending' },
                  ]"
                />
                <h3 class="truncate text-sm font-bold">{{ monitor.name }}</h3>
              </div>
              <div class="flex items-center justify-between gap-4 sm:justify-end">
                <p class="font-mono text-xs text-muted"><span class="font-medium text-ink">{{ monitor.uptime30d.toFixed(2) }}%</span> · {{ t('statusPage.uptime30d') }}</p>
                <StatusBadge :state="monitor.currentState" :paused="monitor.status === 'paused'" compact />
              </div>
            </div>
            <HeartbeatBar
              :monitor="monitor"
              :results="monitor.checks"
              :count="60"
              :allow-mock="false"
              :style="{ '--heartbeat-delay': `${monitorRevealDelay(index) + 320}ms` }"
              animate
            />
            <div class="mt-2 flex justify-between font-mono text-[9px] uppercase tracking-wider text-muted">
              <span>{{ t('statusPage.recentChecks') }}</span><span>{{ t('time.now') }}</span>
            </div>
          </article>
        </div>
        <div v-else class="px-6 py-14 text-center">
          <p class="text-sm font-bold">{{ t('statusPage.emptyTitle') }}</p>
          <p class="mt-2 text-sm text-muted">{{ t('statusPage.emptyBody') }}</p>
        </div>
      </section>

      <section class="status-reveal surface overflow-hidden" style="--reveal-delay: 400ms">
        <div class="border-b border-line px-5 py-5 sm:px-6">
          <h2 class="text-sm font-bold">{{ t('statusPage.incidentHistory') }}</h2>
          <p class="mt-1 text-xs text-muted">{{ t('statusPage.incidentHistorySubtitle') }}</p>
        </div>
        <div v-if="incidents.length" class="divide-y divide-line/70">
          <article
            v-for="(incident, index) in incidents.slice(0, 5)"
            :key="incident.id"
            class="status-incident p-5 sm:px-6"
            :style="{ '--incident-delay': `${460 + index * 70}ms` }"
          >
            <div class="flex items-start gap-3">
              <span class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg" :class="incident.status === 'ongoing' ? 'bg-down/8 text-down' : 'bg-up/8 text-up'">
                <Siren v-if="incident.status === 'ongoing'" :size="15" /><Check v-else :size="15" />
              </span>
              <div class="min-w-0 flex-1">
                <div class="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                  <div>
                    <p class="text-sm font-bold">{{ monitorName(incident.monitorId) }}</p>
                    <p class="mt-1 text-xs leading-5 text-muted">{{ incident.cause }}</p>
                  </div>
                  <span class="w-fit rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider" :class="incident.status === 'ongoing' ? 'bg-down/8 text-down' : 'bg-up/8 text-up'">{{ t(`status.${incident.status}`) }}</span>
                </div>
                <div class="mt-3 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[10px] text-muted">
                  <span>{{ formatDateTime(incident.startedAt) }}</span>
                  <span>{{ t('incidents.duration') }} · {{ formatDuration(duration(incident)) }}</span>
                </div>
              </div>
            </div>
          </article>
        </div>
        <div v-else class="px-6 py-12 text-center">
          <CircleCheckBig :size="24" class="mx-auto mb-3 text-up" />
          <p class="text-sm font-bold">{{ t('statusPage.noIncidentsTitle') }}</p>
          <p class="mt-2 text-xs text-muted">{{ t('statusPage.noIncidentsBody') }}</p>
        </div>
      </section>
    </main>

    <main v-else class="mx-auto flex min-h-[calc(100vh-76px)] max-w-lg items-center justify-center px-5 py-16 text-center">
      <div>
        <span class="mx-auto flex size-14 items-center justify-center rounded-2xl border border-line bg-paper text-muted"><Globe :size="25" /></span>
        <h1 class="mt-6 text-2xl font-bold tracking-tight">{{ t('statusPage.unavailableTitle') }}</h1>
        <p class="mt-3 text-sm leading-6 text-muted">{{ t('statusPage.unavailableBody') }}</p>
      </div>
    </main>

    <footer class="status-reveal mx-auto flex max-w-5xl items-center justify-center gap-1.5 px-5 pb-8 pt-4 text-[11px] text-muted" style="--reveal-delay: 480ms">
      {{ t('statusPage.poweredBy') }} <span class="flex items-center gap-1 font-extrabold text-ink"><Activity :size="12" class="text-up" />mone.</span>
    </footer>
  </div>
</template>

<style scoped>
.status-reveal,
.status-monitor,
.status-incident {
  animation: status-float-up 620ms cubic-bezier(0.23, 1, 0.32, 1) backwards;
}

.status-reveal {
  animation-delay: var(--reveal-delay, 0ms);
}

.status-monitor {
  animation-delay: var(--monitor-delay, 0ms);
  transition: background-color 200ms ease;
}

.status-incident {
  animation-delay: var(--incident-delay, 0ms);
}

@media (hover: hover) and (pointer: fine) {
  .status-monitor:hover {
    background-color: rgba(35, 133, 84, 0.04);
  }
}

.status-grid {
  animation: status-grid-drift 10s ease-in-out infinite alternate;
  will-change: transform;
}

.status-emblem::after {
  position: absolute;
  inset: -2px;
  border: 1.5px solid currentColor;
  border-radius: inherit;
  content: '';
  pointer-events: none;
  animation: status-emblem-breathe 2.2s cubic-bezier(0.23, 1, 0.32, 1) infinite;
}

.status-dot {
  position: relative;
}

.status-dot--live::after {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: currentColor;
  content: '';
  pointer-events: none;
  animation: status-dot-breathe 1.8s cubic-bezier(0.23, 1, 0.32, 1) infinite;
}

.status-orb {
  animation: status-orb-float 7s ease-in-out infinite alternate;
  will-change: transform;
}

.status-sheen {
  animation: status-sheen 5.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  will-change: transform;
}

@keyframes status-float-up {
  from {
    opacity: 0;
    transform: translate3d(0, 26px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@keyframes status-grid-drift {
  from {
    transform: translate3d(0, 0, 0);
  }
  to {
    transform: translate3d(-28px, 14px, 0);
  }
}

@keyframes status-emblem-breathe {
  from {
    opacity: 0.45;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(1.28);
  }
}

@keyframes status-dot-breathe {
  from {
    opacity: 0.5;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(3.2);
  }
}

@keyframes status-orb-float {
  from {
    transform: translate3d(0, 0, 0) scale(1);
  }
  to {
    transform: translate3d(-34px, 26px, 0) scale(1.25);
  }
}

@keyframes status-sheen {
  0% {
    transform: translate3d(-110%, 0, 0);
  }
  55%,
  100% {
    transform: translate3d(330%, 0, 0);
  }
}
</style>
