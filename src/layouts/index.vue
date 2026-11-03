<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from '@cormijs/vue/client'
import { Activity, BellRing, ChevronRight, LayoutDashboard, ListChecks, LogOut, Menu, Plus, Settings, Siren, X } from '@lucide/vue'
import { useMone } from '../composables/useMone'
import { useAuth } from '../composables/useAuth'

const route = useRoute()
const router = useRouter()
const mobileOpen = ref(false)
const { downMonitors } = useMone()
const { signOut } = useAuth()
const isLogin = computed(() => route.path === '/login')
const navItems = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, exact: true },
  { to: '/monitors', label: 'Monitors', icon: ListChecks },
  { to: '/incidents', label: 'Incidents', icon: Siren },
]
</script>

<template>
  <RouterView v-if="isLogin" />
  <div v-else class="min-h-screen bg-canvas">
    <button v-if="mobileOpen" class="fixed inset-0 z-30 bg-forest/40 backdrop-blur-sm lg:hidden" aria-label="Close navigation" @click="mobileOpen = false" />

    <aside class="fixed inset-y-0 left-0 z-40 flex w-[248px] -translate-x-full flex-col bg-forest text-white transition-transform duration-200 lg:translate-x-0" :class="{ 'translate-x-0': mobileOpen }">
      <div class="flex h-[76px] items-center justify-between border-b border-white/10 px-5">
        <RouterLink to="/" class="flex items-center gap-3" @click="mobileOpen = false">
          <span class="flex size-9 items-center justify-center rounded-xl bg-lime text-forest"><Activity :size="21" :stroke-width="2.5" /></span>
          <span class="text-[22px] font-extrabold tracking-[-0.045em]">mone<span class="text-lime">.</span></span>
        </RouterLink>
        <button class="icon-button text-white/60 hover:border-white/10 hover:bg-white/10 hover:text-white lg:hidden" aria-label="Close navigation" @click="mobileOpen = false"><X :size="19" /></button>
      </div>

      <div class="flex-1 overflow-y-auto px-3 py-5">
        <RouterLink to="/monitors/create" class="mb-6 flex items-center justify-between rounded-xl bg-lime px-4 py-3 text-sm font-bold text-forest hover:bg-white" @click="mobileOpen = false">
          <span class="flex items-center gap-2"><Plus :size="17" :stroke-width="2.5" /> New monitor</span>
          <ChevronRight :size="16" />
        </RouterLink>

        <p class="mb-2 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">Workspace</p>
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

        <p class="mb-2 mt-7 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">Configuration</p>
        <nav class="space-y-1">
          <RouterLink to="/settings/notifications" class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/60 hover:bg-white/7 hover:text-white" :class="{ 'bg-white/10 !text-white': route.path === '/settings/notifications' }" @click="mobileOpen = false">
            <BellRing :size="18" :stroke-width="1.8" /> Notifications
          </RouterLink>
          <RouterLink to="/settings" class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/60 hover:bg-white/7 hover:text-white" :class="{ 'bg-white/10 !text-white': route.path === '/settings' }" @click="mobileOpen = false">
            <Settings :size="18" :stroke-width="1.8" /> Settings
          </RouterLink>
        </nav>
      </div>

      <div class="border-t border-white/10 p-4">
        <div class="mb-4 flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2.5 text-xs text-white/60">
          <span class="size-1.5 rounded-full" :class="downMonitors.length ? 'bg-down' : 'bg-lime'" />
          {{ downMonitors.length ? `${downMonitors.length} monitor needs attention` : 'All systems operational' }}
        </div>
        <div class="flex items-center gap-3 px-1">
          <span class="flex size-9 items-center justify-center rounded-full border border-white/15 bg-white/10 font-mono text-xs">YO</span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-xs font-semibold">Your workspace</p>
            <p class="truncate text-[11px] text-white/40">Personal</p>
          </div>
          <button class="text-white/40 hover:text-white" aria-label="Sign out" @click="signOut().then(() => router.push('/login'))"><LogOut :size="16" /></button>
        </div>
      </div>
    </aside>

    <div class="lg:pl-[248px]">
      <div class="flex h-[64px] items-center justify-between border-b border-line bg-paper px-5 lg:hidden">
        <button class="icon-button -ml-2" aria-label="Open navigation" @click="mobileOpen = true"><Menu :size="21" /></button>
        <RouterLink to="/" class="flex items-center gap-2">
          <span class="flex size-8 items-center justify-center rounded-lg bg-forest text-lime"><Activity :size="18" /></span>
          <span class="text-xl font-extrabold tracking-tight">mone.</span>
        </RouterLink>
        <span class="w-9" />
      </div>

      <main class="mx-auto min-h-screen w-full max-w-[1500px] px-5 py-7 sm:px-8 sm:py-9 lg:px-10 xl:px-12">
        <RouterView v-slot="{ Component }">
          <Transition name="page" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </main>
    </div>
  </div>
</template>
