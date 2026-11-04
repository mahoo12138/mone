<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from '@cormijs/vue/client'
import { Activity, BellRing, Check, ChevronDown, ChevronRight, Globe, Globe2, LayoutDashboard, ListChecks, LogOut, Menu, Plus, Settings, Siren, X } from '@lucide/vue'
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRoot,
} from 'reka-ui'
import { useI18n } from 'vue-i18n'
import { useMone } from '../composables/useMone'
import { useAuth } from '../composables/useAuth'
import { currentLocale, localeOptions, setLocale, type Locale } from '../i18n'
import Toaster from '../components/ui/Toaster.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const mobileOpen = ref(false)
const { downMonitors, loading, error, refresh } = useMone()
const { signOut } = useAuth()
const isBarePage = computed(() => route.path === '/login' || route.path === '/verify' || route.path.startsWith('/status/'))
const navItems = computed(() => [
  { to: '/', label: t('nav.overview'), icon: LayoutDashboard, exact: true },
  { to: '/monitors', label: t('nav.monitors'), icon: ListChecks },
  { to: '/incidents', label: t('nav.incidents'), icon: Siren },
])
const configItems = computed(() => [
  { to: '/settings/notifications', label: t('nav.notifications'), icon: BellRing },
  { to: '/settings/status-page', label: t('nav.statusPage'), icon: Globe2 },
  { to: '/settings', label: t('nav.settings'), icon: Settings },
])

async function leave() {
  await signOut()
  router.push('/login')
}
</script>

<template>
  <RouterView v-if="isBarePage" />
  <div v-else class="min-h-screen bg-canvas">
    <button v-if="mobileOpen" class="fixed inset-0 z-30 bg-forest/40 backdrop-blur-sm lg:hidden" :aria-label="t('nav.closeNavigation')" @click="mobileOpen = false" />

    <aside class="fixed inset-y-0 left-0 z-40 flex w-[248px] -translate-x-full flex-col bg-forest text-white transition-transform duration-200 lg:translate-x-0" :class="{ 'translate-x-0': mobileOpen }">
      <div class="flex h-[76px] items-center justify-between border-b border-white/10 px-5">
        <RouterLink to="/" class="flex items-center gap-3" @click="mobileOpen = false">
          <span class="flex size-9 items-center justify-center rounded-xl bg-lime text-forest"><Activity :size="21" :stroke-width="2.5" /></span>
          <span class="text-[22px] font-extrabold tracking-[-0.045em]">mone<span class="text-lime">.</span></span>
        </RouterLink>
        <button class="icon-button text-white/60 hover:border-white/10 hover:bg-white/10 hover:text-white lg:hidden" :aria-label="t('nav.closeNavigation')" @click="mobileOpen = false"><X :size="19" /></button>
      </div>

      <div class="flex-1 overflow-y-auto px-3 py-5">
        <RouterLink to="/monitors/create" class="mb-6 flex items-center justify-between rounded-xl bg-lime px-4 py-3 text-sm font-bold text-forest hover:bg-white" @click="mobileOpen = false">
          <span class="flex items-center gap-2"><Plus :size="17" :stroke-width="2.5" /> {{ t('common.newMonitor') }}</span>
          <ChevronRight :size="16" />
        </RouterLink>

        <p class="mb-2 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">{{ t('nav.workspace') }}</p>
        <nav class="space-y-1">
          <RouterLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/60 hover:bg-white/7 hover:text-white"
            :class="{ 'bg-white/10 !text-white': item.exact ? route.path === '/' : route.path.startsWith(item.to) }"
            @click="mobileOpen = false"
          >
            <component :is="item.icon" :size="18" :stroke-width="1.8" />
            <span>{{ item.label }}</span>
            <span v-if="item.to === '/incidents' && downMonitors.length" class="ml-auto rounded-full bg-down px-2 py-0.5 font-mono text-[10px] font-medium text-white">{{ downMonitors.length }}</span>
          </RouterLink>
        </nav>

        <p class="mb-2 mt-7 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">{{ t('nav.configuration') }}</p>
        <nav class="space-y-1">
          <RouterLink
            v-for="item in configItems"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/60 hover:bg-white/7 hover:text-white"
            :class="{ 'bg-white/10 !text-white': route.path === item.to }"
            @click="mobileOpen = false"
          >
            <component :is="item.icon" :size="18" :stroke-width="1.8" />
            {{ item.label }}
          </RouterLink>
        </nav>
      </div>

      <div class="border-t border-white/10 p-4">
        <div class="mb-4 flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2.5 text-xs text-white/60">
          <span class="size-1.5 rounded-full" :class="downMonitors.length ? 'bg-down' : 'bg-lime'" />
          {{ downMonitors.length ? t('nav.attention', { count: downMonitors.length }) : t('nav.allOperational') }}
        </div>

        <DropdownMenuRoot>
          <DropdownMenuTrigger
            class="flex w-full items-center gap-3 rounded-lg px-1 py-1 text-left outline-none hover:bg-white/5 data-[state=open]:bg-white/10"
            :aria-label="t('nav.accountMenu')"
          >
            <span class="flex size-9 items-center justify-center rounded-full border border-white/15 bg-white/10 font-mono text-xs">YO</span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-xs font-semibold">{{ t('nav.yourWorkspace') }}</p>
              <p class="truncate text-[11px] text-white/40">{{ t('nav.personal') }}</p>
            </div>
            <ChevronDown :size="15" class="shrink-0 text-white/40" />
          </DropdownMenuTrigger>

          <DropdownMenuPortal>
            <DropdownMenuContent
              side="top"
              align="start"
              :side-offset="8"
              class="z-50 w-56 rounded-xl border border-line bg-paper p-1 shadow-xl shadow-forest/15 outline-none"
            >
              <DropdownMenuLabel class="px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">{{ t('nav.language') }}</DropdownMenuLabel>
              <DropdownMenuRadioGroup :model-value="currentLocale">
                <DropdownMenuRadioItem
                  v-for="option in localeOptions"
                  :key="option.value"
                  :value="option.value"
                  class="flex cursor-pointer items-center gap-2 rounded-lg py-2 pl-2.5 pr-3 text-sm text-ink outline-none data-[highlighted]:bg-canvas"
                  @select="setLocale(option.value as Locale)"
                >
                  <span class="flex size-4 items-center justify-center text-up">
                    <Globe v-if="currentLocale !== option.value" :size="13" class="text-muted" />
                    <Check v-else :size="14" />
                  </span>
                  {{ option.label }}
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>

              <DropdownMenuSeparator class="my-1 h-px bg-line" />

              <DropdownMenuItem
                class="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-semibold text-down outline-none data-[highlighted]:bg-down/8"
                @select="leave"
              >
                <LogOut :size="14" /> {{ t('nav.signOut') }}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenuPortal>
        </DropdownMenuRoot>
      </div>
    </aside>

    <div class="lg:pl-[248px]">
      <div class="flex h-[64px] items-center justify-between border-b border-line bg-paper px-5 lg:hidden">
        <button class="icon-button -ml-2" :aria-label="t('nav.openNavigation')" @click="mobileOpen = true"><Menu :size="21" /></button>
        <RouterLink to="/" class="flex items-center gap-2">
          <span class="flex size-8 items-center justify-center rounded-lg bg-forest text-lime"><Activity :size="18" /></span>
          <span class="text-xl font-extrabold tracking-tight">mone.</span>
        </RouterLink>
        <span class="w-9" />
      </div>

      <main class="mx-auto min-h-screen w-full max-w-[1500px] px-5 py-7 sm:px-8 sm:py-9 lg:px-10 xl:px-12">
        <div v-if="loading" class="flex min-h-[50vh] items-center justify-center text-sm text-muted">{{ t('app.loading') }}</div>
        <div v-else-if="error" class="flex min-h-[50vh] flex-col items-center justify-center text-center">
          <p class="text-sm font-bold text-down">{{ t('app.dataError') }}</p>
          <p class="mt-2 max-w-md text-sm text-muted">{{ error }}</p>
          <button class="button-secondary mt-5" @click="refresh">{{ t('app.retry') }}</button>
        </div>
        <RouterView v-else v-slot="{ Component }">
          <Transition name="page" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </main>
    </div>

    <Toaster />
  </div>
</template>
