<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from '@cormijs/vue/client'
import { Activity, ArrowRight, Check, Globe, LockKeyhole } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import AppTabs from '../components/ui/AppTabs.vue'
import { useAuth } from '../composables/useAuth'
import { isSupabaseConfigured } from '../services/supabase'
import { currentLocale, localeOptions, setLocale } from '../i18n'

const router = useRouter()
const { t } = useI18n()
const { signIn, signUp } = useAuth()
const mode = ref<'sign-in' | 'sign-up'>('sign-in')
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const confirmationSent = ref(false)
const modes = computed(() => [
  { value: 'sign-in' as const, label: t('login.signIn') },
  { value: 'sign-up' as const, label: t('login.signUp') },
])
const submitLabel = computed(() => {
  if (loading.value) return t('login.checkingSession')
  if (!isSupabaseConfigured) return t('login.enterDemo')
  return mode.value === 'sign-in' ? t('login.signIn') : t('login.createAccount')
})

async function submit() {
  loading.value = true
  error.value = ''
  const result = mode.value === 'sign-in'
    ? await signIn(email.value, password.value)
    : await signUp(email.value, password.value)
  loading.value = false
  if (!result.ok) {
    error.value = result.message || t(mode.value === 'sign-in' ? 'login.failedSignIn' : 'login.failedSignUp')
    return
  }
  if (mode.value === 'sign-in') router.push('/')
  else confirmationSent.value = true
}
</script>

<template>
  <main class="grid min-h-screen bg-paper lg:grid-cols-[1fr_0.9fr]">
    <section class="flex items-center justify-center px-6 py-12 sm:px-12">
      <div class="w-full max-w-sm">
        <div class="mb-12 flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <span class="flex size-10 items-center justify-center rounded-xl bg-forest text-lime"><Activity :size="22" /></span>
            <span class="text-2xl font-extrabold tracking-[-0.045em]">mone<span class="text-up">.</span></span>
          </div>
          <button
            class="icon-button !w-auto gap-1.5 !px-2.5"
            :aria-label="t('nav.language')"
            @click="setLocale(currentLocale === 'en' ? 'zh-CN' : 'en')"
          >
            <Globe :size="16" />
            <span class="text-xs font-semibold">{{ (localeOptions.find((option) => option.value !== currentLocale))?.label }}</span>
          </button>
        </div>
        <p class="eyebrow mb-3">{{ t(mode === 'sign-in' ? 'login.eyebrowSignIn' : 'login.eyebrowSignUp') }}</p>
        <h1 class="text-3xl font-bold tracking-[-0.04em]">{{ t(mode === 'sign-in' ? 'login.titleSignIn' : 'login.titleSignUp') }}</h1>
        <p class="mt-3 text-sm leading-6 text-muted">{{ t(mode === 'sign-in' ? 'login.introSignIn' : 'login.introSignUp') }}</p>

        <div v-if="confirmationSent" class="mt-8 rounded-xl border border-up/20 bg-up/5 p-5">
          <p class="flex items-center gap-2 text-sm font-bold text-up"><Check :size="17" /> {{ t('login.confirmationTitle') }}</p>
          <p class="mt-2 text-sm leading-6 text-muted">{{ t('login.confirmationBody', { email }) }}</p>
          <button class="button-secondary mt-4" @click="confirmationSent = false; mode = 'sign-in'">{{ t('login.backToSignIn') }}</button>
        </div>

        <form v-else class="mt-8 space-y-5" @submit.prevent="submit">
          <AppTabs v-if="isSupabaseConfigured" v-model="mode" :options="modes" equal-width :list-label="t('login.signIn')" />
          <label class="block"><span class="field-label">{{ t('login.email') }}</span><input v-model="email" type="email" class="field" :required="isSupabaseConfigured" autocomplete="email"></label>
          <label class="block"><span class="field-label">{{ t('login.password') }}</span><input v-model="password" type="password" class="field" :required="isSupabaseConfigured" minlength="6" autocomplete="current-password"></label>
          <p v-if="error" class="rounded-xl border border-down/20 bg-down/5 px-3 py-2 text-sm text-down" role="alert">{{ error }}</p>
          <button class="button-primary w-full !py-3" :disabled="loading">{{ submitLabel }}<ArrowRight :size="17" /></button>
        </form>

        <p class="mt-5 flex items-center justify-center gap-2 text-center text-[11px] text-muted">
          <LockKeyhole :size="13" /> {{ t(isSupabaseConfigured ? 'login.secured' : 'login.demoNotice') }}
        </p>
      </div>
    </section>

    <section class="relative hidden overflow-hidden bg-forest p-12 text-white lg:flex lg:flex-col lg:justify-between">
      <div class="absolute inset-0 opacity-40" style="background-image: radial-gradient(circle at 75% 25%, rgba(199,243,107,.2), transparent 32%), linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px); background-size: auto, 32px 32px, 32px 32px;" />
      <p class="relative flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-white/40"><Globe :size="13" /> {{ t('login.heroEyebrow') }}</p>
      <div class="relative max-w-lg">
        <p class="text-4xl font-bold leading-[1.15] tracking-[-0.04em]">{{ t('login.heroLineOne') }}<br><span class="text-lime">{{ t('login.heroLineTwo') }}</span></p>
        <p class="mt-5 max-w-md text-sm leading-7 text-white/55">{{ t('login.heroBody') }}</p>
        <div class="mt-10 space-y-3 text-xs text-white/70">
          <p class="flex items-center gap-2"><Check :size="15" class="text-lime" /> {{ t('login.heroPointOne') }}</p>
          <p class="flex items-center gap-2"><Check :size="15" class="text-lime" /> {{ t('login.heroPointTwo') }}</p>
          <p class="flex items-center gap-2"><Check :size="15" class="text-lime" /> {{ t('login.heroPointThree') }}</p>
        </div>
      </div>
      <p class="relative font-mono text-[10px] text-white/30">{{ t('login.heroFooter') }}</p>
    </section>
  </main>
</template>
