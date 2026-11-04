<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from '@cormijs/vue/client'
import { Activity, ArrowRight, CheckCircle, ShieldAlert } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { getSupabase } from '../services/supabase'
import type { EmailOtpType } from '@supabase/supabase-js'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

type State = 'verifying' | 'success' | 'error'
const state = ref<State>('verifying')
const message = ref('')

const type = computed(() => String(route.query.type ?? 'signup') as EmailOtpType)

async function verify() {
  const tokenHash = String(route.query.token_hash ?? '')
  if (!tokenHash) {
    state.value = 'error'
    message.value = t('verify.errorMissingToken')
    return
  }
  state.value = 'verifying'
  const { error } = await getSupabase().auth.verifyOtp({ token_hash: tokenHash, type })
  if (error) {
    state.value = 'error'
    message.value = error.message
    return
  }
  state.value = 'success'
  setTimeout(() => router.replace('/'), 1600)
}

onMounted(verify)
</script>

<template>
  <main class="grid min-h-screen place-items-center bg-paper px-6 py-12">
    <div class="w-full max-w-md">
      <div class="mb-10 flex items-center gap-3">
        <span class="flex size-10 items-center justify-center rounded-xl bg-forest text-lime"><Activity :size="22" /></span>
        <span class="text-2xl font-extrabold tracking-[-0.045em]">mone<span class="text-up">.</span></span>
      </div>

      <div v-if="state === 'verifying'" class="surface p-7 text-center">
        <p class="eyebrow">{{ t('verify.eyebrow') }}</p>
        <h1 class="mt-3 text-xl font-bold tracking-[-0.03em]">{{ t('verify.verifying') }}</h1>
        <p class="mt-2 text-sm leading-6 text-muted">{{ t('verify.verifyingHint') }}</p>
      </div>

      <div v-else-if="state === 'success'" class="surface p-7 text-center">
        <span class="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-up/10 text-up"><CheckCircle :size="26" /></span>
        <p class="eyebrow">{{ t('verify.eyebrow') }}</p>
        <h1 class="mt-3 text-xl font-bold tracking-[-0.03em]">{{ t('verify.success') }}</h1>
        <p class="mt-2 text-sm leading-6 text-muted">{{ t('verify.successHint') }}</p>
      </div>

      <div v-else class="surface p-7 text-center">
        <span class="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-down/10 text-down"><ShieldAlert :size="26" /></span>
        <p class="eyebrow">{{ t('verify.eyebrow') }}</p>
        <h1 class="mt-3 text-xl font-bold tracking-[-0.03em]">{{ t('verify.failed') }}</h1>
        <p class="mt-2 break-words text-sm leading-6 text-muted">{{ message }}</p>
        <div class="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button class="button-secondary" @click="verify">{{ t('verify.retry') }}</button>
          <button class="button-primary" @click="router.replace('/login')">{{ t('verify.backToSignIn') }}<ArrowRight :size="16" /></button>
        </div>
      </div>
    </div>
  </main>
</template>
