import { computed, watch } from 'vue'
import { createI18n } from 'vue-i18n'
import { en } from './locales/en'
import type { AppMessages } from './locales/en'
import { zhCN } from './locales/zh-CN'

declare module 'vue-i18n' {
  interface DefineLocaleMessage extends AppMessages {}
}

export const localeOptions = [
  { value: 'en', label: 'English', intl: 'en-GB' },
  { value: 'zh-CN', label: '简体中文', intl: 'zh-CN' },
] as const

export type Locale = (typeof localeOptions)[number]['value']

const storageKey = 'mone-locale'

function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'zh-CN'
}

function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem(storageKey)
    if (isLocale(saved)) return saved
  } catch {
    // A blocked localStorage should not prevent language detection.
  }
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en'
}

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: detectLocale(),
  fallbackLocale: 'en',
  messages: { en, 'zh-CN': zhCN },
})

export const currentLocale = computed<Locale>(() => i18n.global.locale.value as Locale)

watch(currentLocale, (value) => {
  document.documentElement.lang = value
  try {
    localStorage.setItem(storageKey, value)
  } catch {
    // The app stays usable when storage is unavailable.
  }
}, { immediate: true })

export function setLocale(value: Locale) {
  i18n.global.locale.value = value
}

/** The Intl tag matching the active locale, used for dates and relative times. */
export const intlLocale = computed(() => localeOptions.find((option) => option.value === currentLocale.value)?.intl ?? 'en-GB')

/** Translate outside of a component setup, e.g. in services and formatters. */
export const t = i18n.global.t
