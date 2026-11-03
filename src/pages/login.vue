<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from '@cormijs/vue/client'
import { Activity, ArrowRight, Check, LockKeyhole } from '@lucide/vue'
import { useAuth } from '../composables/useAuth'
import { isSupabaseConfigured } from '../services/supabase'

const router = useRouter()
const { signIn } = useAuth()
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function signInWithCredentials() {
  loading.value = true
  error.value = ''
  const success = await signIn(email.value, password.value)
  loading.value = false
  if (success) router.push('/')
  else error.value = 'Unable to sign in. Check your email and password.'
}
</script>

<template>
  <main class="grid min-h-screen bg-paper lg:grid-cols-[1fr_0.9fr]">
    <section class="flex items-center justify-center px-6 py-12 sm:px-12">
      <div class="w-full max-w-sm">
        <div class="mb-12 flex items-center gap-3"><span class="flex size-10 items-center justify-center rounded-xl bg-forest text-lime"><Activity :size="22" /></span><span class="text-2xl font-extrabold tracking-[-0.045em]">mone<span class="text-up">.</span></span></div>
        <p class="eyebrow mb-3">Welcome back</p>
        <h1 class="text-3xl font-bold tracking-[-0.04em]">Return to your control room.</h1>
        <p class="mt-3 text-sm leading-6 text-muted">Sign in to review service health, incidents, and monitor configuration.</p>
        <form class="mt-8 space-y-5" @submit.prevent="signInWithCredentials">
          <label class="block"><span class="field-label">Email address</span><input v-model="email" type="email" class="field" :required="isSupabaseConfigured" autocomplete="email"></label>
          <label class="block"><span class="field-label">Password</span><input v-model="password" type="password" class="field" :required="isSupabaseConfigured" autocomplete="current-password"></label>
          <p v-if="error" class="rounded-xl border border-down/20 bg-down/5 px-3 py-2 text-sm text-down" role="alert">{{ error }}</p>
          <button class="button-primary w-full !py-3" :disabled="loading">{{ loading ? 'Checking session…' : isSupabaseConfigured ? 'Sign in' : 'Enter demo workspace' }}<ArrowRight :size="17" /></button>
        </form>
        <p class="mt-5 flex items-center justify-center gap-2 text-center text-[11px] text-muted"><LockKeyhole :size="13" /> {{ isSupabaseConfigured ? 'Secured by Supabase Auth' : 'Demo mode: Supabase Auth will replace local sign-in.' }}</p>
      </div>
    </section>
    <section class="relative hidden overflow-hidden bg-forest p-12 text-white lg:flex lg:flex-col lg:justify-between">
      <div class="absolute inset-0 opacity-40" style="background-image: radial-gradient(circle at 75% 25%, rgba(199,243,107,.2), transparent 32%), linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px); background-size: auto, 32px 32px, 32px 32px;" />
      <p class="relative font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">External monitoring / No agents</p>
      <div class="relative max-w-lg">
        <p class="text-4xl font-bold leading-[1.15] tracking-[-0.04em]">Quiet infrastructure.<br><span class="text-lime">Clear signals.</span></p>
        <p class="mt-5 max-w-md text-sm leading-7 text-white/55">HTTP, TCP, and certificate checks from a lightweight, self-hosted workspace.</p>
        <div class="mt-10 space-y-3 text-xs text-white/70"><p class="flex items-center gap-2"><Check :size="15" class="text-lime" /> Availability and response history</p><p class="flex items-center gap-2"><Check :size="15" class="text-lime" /> Incident and recovery tracking</p><p class="flex items-center gap-2"><Check :size="15" class="text-lime" /> Telegram and Discord alerts</p></div>
      </div>
      <p class="relative font-mono text-[10px] text-white/30">MONE / LIGHTWEIGHT UPTIME MONITORING</p>
    </section>
  </main>
</template>
