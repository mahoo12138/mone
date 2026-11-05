<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from '@cormijs/vue/client'
import { Activity, ArrowRight, BellRing, Check, Code, ExternalLink, Globe, Globe2, LockKeyhole, Radar, Server, Siren } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { currentLocale, localeOptions, setLocale } from '../i18n'

const { t } = useI18n()
const repoUrl = 'https://github.com/mahoo12138/mone'
const instanceHost = window.location.host
// A fixed, purely decorative pattern: no uptime figure on this page refers to a real service.
const signalBars = Array.from({ length: 42 }, (_, index) => 26 + ((index * 37) % 11) * 6)
const features = computed(() => [
  { icon: Radar, title: t('landing.featureCheckTitle'), body: t('landing.featureCheckBody') },
  { icon: Activity, title: t('landing.featureHeartbeatTitle'), body: t('landing.featureHeartbeatBody') },
  { icon: Siren, title: t('landing.featureIncidentTitle'), body: t('landing.featureIncidentBody') },
  { icon: BellRing, title: t('landing.featureAlertTitle'), body: t('landing.featureAlertBody') },
  { icon: Globe2, title: t('landing.featureStatusTitle'), body: t('landing.featureStatusBody') },
  { icon: Server, title: t('landing.featureAgentlessTitle'), body: t('landing.featureAgentlessBody') },
])
</script>

<template>
  <div class="landing min-h-screen bg-paper">
    <header class="landing-reveal mx-auto flex h-[76px] max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
      <div class="flex items-center gap-3">
        <span class="flex size-9 items-center justify-center rounded-xl bg-forest text-lime"><Activity :size="21" :stroke-width="2.4" /></span>
        <span class="text-2xl font-extrabold tracking-[-0.045em]">mone<span class="text-up">.</span></span>
      </div>
      <nav class="flex items-center gap-1.5 sm:gap-3">
        <button
          class="icon-button !w-auto gap-1.5 !px-2 sm:!px-2.5"
          :aria-label="t('nav.language')"
          @click="setLocale(currentLocale === 'en' ? 'zh-CN' : 'en')"
        >
          <Globe :size="15" />
          <span class="hidden text-xs font-semibold sm:inline">{{ localeOptions.find((option) => option.value !== currentLocale)?.label }}</span>
        </button>
        <a :href="repoUrl" target="_blank" rel="noopener noreferrer" class="icon-button !w-auto gap-1.5 !px-2 sm:!px-2.5" :aria-label="t('landing.ctaGitHub')">
          <Code :size="15" />
          <span class="hidden text-xs font-semibold sm:inline">{{ t('landing.ctaGitHub') }}</span>
        </a>
        <RouterLink to="/login?mode=sign-up" class="hidden text-sm font-semibold text-muted hover:text-ink sm:block">{{ t('landing.ctaSignUp') }}</RouterLink>
        <RouterLink to="/login" class="button-primary !px-3 !py-2 whitespace-nowrap">{{ t('login.signIn') }}<ArrowRight :size="15" /></RouterLink>
      </nav>
    </header>

    <main class="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
      <section class="grid items-center gap-12 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
        <div>
          <p class="landing-reveal eyebrow mb-4" style="--reveal-delay: 60ms">{{ t('landing.eyebrow') }}</p>
          <h1 class="landing-reveal text-4xl font-bold leading-[1.1] tracking-[-0.045em] sm:text-5xl lg:text-[56px]" style="--reveal-delay: 120ms">
            {{ t('landing.titleOne') }}<br><span class="text-up">{{ t('landing.titleTwo') }}</span>
          </h1>
          <p class="landing-reveal mt-6 max-w-xl text-base leading-7 text-muted sm:text-[17px]" style="--reveal-delay: 180ms">{{ t('landing.body') }}</p>
          <div class="landing-reveal mt-9 flex flex-wrap items-center gap-3" style="--reveal-delay: 240ms">
            <RouterLink to="/login" class="button-primary !px-5 !py-3">{{ t('landing.ctaSignIn') }}<ArrowRight :size="17" /></RouterLink>
            <RouterLink to="/login?mode=sign-up" class="button-secondary !px-5 !py-3">{{ t('landing.ctaSignUp') }}</RouterLink>
            <a :href="repoUrl" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 text-sm font-semibold text-muted underline-offset-4 hover:text-ink hover:underline">{{ t('landing.ctaGitHub') }}<ExternalLink :size="14" /></a>
          </div>
          <p class="landing-reveal mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted" style="--reveal-delay: 300ms">
            <span class="flex items-center gap-1.5"><Check :size="14" class="text-up" />{{ t('landing.noteAgentless') }}</span>
            <span class="flex items-center gap-1.5"><Check :size="14" class="text-up" />{{ t('landing.notePublicPage') }}</span>
            <span class="flex items-center gap-1.5"><Check :size="14" class="text-up" />{{ t('landing.noteOpenSignup') }}</span>
          </p>
        </div>

        <div class="landing-reveal relative overflow-hidden rounded-3xl bg-forest p-7 text-white sm:p-9" style="--reveal-delay: 200ms">
          <div class="landing-orb absolute -right-10 -top-14 size-36 rounded-full bg-lime/10 blur-2xl" />
          <p class="relative flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">
            <span class="landing-pulse size-1.5 rounded-full bg-lime text-lime" />{{ t('landing.signalLabel') }}
          </p>
          <div class="relative mt-7 flex h-28 items-end gap-[3px]" aria-hidden="true">
            <span
              v-for="(height, index) in signalBars"
              :key="index"
              class="landing-bar flex-1 rounded-[2px] bg-lime/35"
              :style="{ height: `${height}%`, '--bar-index': index }"
            />
          </div>
          <div class="relative mt-7 space-y-3 border-t border-white/10 pt-6 text-xs text-white/55">
            <p class="flex items-center justify-between gap-4"><span>{{ t('landing.signalRowOne') }}</span><span class="font-mono text-white/35">HTTP · TCP</span></p>
            <p class="flex items-center justify-between gap-4"><span>{{ t('landing.signalRowTwo') }}</span><span class="font-mono text-white/35">30s</span></p>
            <p class="flex items-center justify-between gap-4"><span>{{ t('landing.signalRowThree') }}</span><span class="font-mono text-white/35">/status/…</span></p>
          </div>
          <p class="relative mt-6 font-mono text-[10px] leading-5 text-white/30">{{ t('landing.signalDisclaimer') }}</p>
        </div>
      </section>

      <section class="landing-reveal border-t border-line py-14" style="--reveal-delay: 340ms">
        <p class="eyebrow mb-3">{{ t('landing.pathsEyebrow') }}</p>
        <h2 class="text-2xl font-bold tracking-[-0.04em] sm:text-[30px]">{{ t('landing.pathsTitle') }}</h2>
        <div class="mt-8 grid gap-4 lg:grid-cols-2">
          <article class="surface flex flex-col p-6 sm:p-7">
            <span class="flex size-9 items-center justify-center rounded-xl bg-canvas text-up"><Globe2 :size="18" /></span>
            <h3 class="mt-4 text-base font-bold">{{ t('landing.pathUseTitle') }}</h3>
            <p class="mt-2 flex-1 text-sm leading-6 text-muted">{{ t('landing.pathUseBody') }}</p>
            <RouterLink to="/login" class="button-primary mt-6 self-start">{{ t('landing.pathUseCta') }}<ArrowRight :size="16" /></RouterLink>
          </article>
          <article class="surface flex flex-col p-6 sm:p-7">
            <span class="flex size-9 items-center justify-center rounded-xl bg-canvas text-up"><Server :size="18" /></span>
            <h3 class="mt-4 text-base font-bold">{{ t('landing.pathDeployTitle') }}</h3>
            <p class="mt-2 flex-1 text-sm leading-6 text-muted">{{ t('landing.pathDeployBody') }}</p>
            <a :href="repoUrl" target="_blank" rel="noopener noreferrer" class="button-secondary mt-6 self-start">{{ t('landing.pathDeployCta') }}<ExternalLink :size="15" /></a>
          </article>
        </div>
        <p class="mt-5 flex items-start gap-2.5 rounded-xl border border-line bg-canvas px-4 py-3.5 text-xs leading-5 text-muted">
          <LockKeyhole :size="14" class="mt-0.5 shrink-0 text-up" />{{ t('landing.pathsDisclosure') }}
        </p>
      </section>

      <section class="landing-reveal border-t border-line pt-14" style="--reveal-delay: 380ms">
        <p class="eyebrow mb-3">{{ t('landing.featuresEyebrow') }}</p>
        <h2 class="text-2xl font-bold tracking-[-0.04em] sm:text-[30px]">{{ t('landing.featuresTitle') }}</h2>
        <div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <article v-for="feature in features" :key="feature.title" class="surface p-5 transition-transform duration-200 hover:-translate-y-0.5 sm:p-6">
            <span class="flex size-9 items-center justify-center rounded-xl bg-canvas text-up"><component :is="feature.icon" :size="18" /></span>
            <h3 class="mt-4 text-sm font-bold">{{ feature.title }}</h3>
            <p class="mt-2 text-sm leading-6 text-muted">{{ feature.body }}</p>
          </article>
        </div>
      </section>

      <section class="landing-reveal mt-14 rounded-3xl border border-line bg-canvas px-6 py-8 text-center sm:px-10 sm:py-12" style="--reveal-delay: 460ms">
        <span class="mx-auto flex size-11 items-center justify-center rounded-2xl bg-forest text-lime"><Radar :size="20" /></span>
        <h2 class="mt-5 text-xl font-bold tracking-[-0.035em] sm:text-2xl">{{ t('landing.ctaBandTitle') }}</h2>
        <p class="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted">{{ t('landing.ctaBandBody') }}</p>
        <div class="mt-7 flex flex-wrap items-center justify-center gap-3">
          <RouterLink to="/login" class="button-primary !px-6 !py-3">{{ t('landing.ctaSignIn') }}<ArrowRight :size="17" /></RouterLink>
          <a :href="repoUrl" target="_blank" rel="noopener noreferrer" class="button-secondary !px-6 !py-3">{{ t('landing.pathDeployCta') }}<ExternalLink :size="15" /></a>
        </div>
      </section>
    </main>

    <footer class="border-t border-line">
      <div class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-7 text-[11px] text-muted sm:flex-row sm:px-8">
        <span class="flex items-center gap-1.5"><Activity :size="13" class="text-up" /><span class="font-extrabold text-ink">mone.</span> {{ t('landing.footerTagline') }}</span>
        <p class="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <span class="font-mono">{{ t('landing.footerInstance') }} · {{ instanceHost }}</span>
          <a :href="repoUrl" target="_blank" rel="noopener noreferrer" class="font-semibold hover:text-ink">{{ t('landing.footerSource') }}</a>
        </p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.landing-reveal {
  animation: landing-rise 620ms cubic-bezier(0.23, 1, 0.32, 1) backwards;
  animation-delay: var(--reveal-delay, 0ms);
}

.landing-bar {
  transform-origin: center bottom;
  animation: landing-bar-in 520ms cubic-bezier(0.23, 1, 0.32, 1) backwards;
  animation-delay: calc(320ms + var(--bar-index) * 14ms);
}

.landing-pulse {
  position: relative;
}

.landing-pulse::after {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: currentColor;
  content: '';
  pointer-events: none;
  animation: landing-pulse 1.8s cubic-bezier(0.23, 1, 0.32, 1) infinite;
}

.landing-orb {
  animation: landing-orb 7s ease-in-out infinite alternate;
  will-change: transform;
}

@keyframes landing-rise {
  from { opacity: 0; transform: translate3d(0, 22px, 0); }
  to { opacity: 1; transform: translate3d(0, 0, 0); }
}

@keyframes landing-bar-in {
  from { opacity: 0; transform: scaleY(0.2); }
  to { opacity: 1; transform: scaleY(1); }
}

@keyframes landing-pulse {
  from { opacity: 0.45; transform: scale(1); }
  to { opacity: 0; transform: scale(3.4); }
}

@keyframes landing-orb {
  from { transform: translate3d(0, 0, 0) scale(1); }
  to { transform: translate3d(-30px, 24px, 0) scale(1.2); }
}
</style>
