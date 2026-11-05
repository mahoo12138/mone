import { ref } from 'vue'
import type { Session } from '@supabase/supabase-js'
import { getSupabase, isDemoMode, isSupabaseConfigured } from '../services/supabase'

export const session = ref<Session | null>(null)
export const loading = ref(isSupabaseConfigured)
let initialization: Promise<void> | null = null

export function initAuth() {
  if (initialization) return initialization

  if (!isSupabaseConfigured) {
    if (isDemoMode) session.value = { user: { id: 'demo-user' } } as Session
    loading.value = false
    return Promise.resolve()
  }

  const supabase = getSupabase()
  initialization = supabase.auth.getSession().then(({ data }) => {
    session.value = data.session
  }).finally(() => {
    loading.value = false
  })

  supabase.auth.onAuthStateChange((_event, nextSession) => {
    session.value = nextSession
  })

  return initialization
}

export function useAuth() {
  void initAuth()

  async function signIn(email: string, password: string) {
    if (isDemoMode) return { ok: true, message: '' }
    const { error } = await getSupabase().auth.signInWithPassword({ email, password })
    return { ok: !error, message: error?.message ?? '' }
  }

  async function signUp(email: string, password: string) {
    if (isDemoMode) return { ok: true, message: '' }
    const { error } = await getSupabase().auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/overview` },
    })
    return { ok: !error, message: error?.message ?? '' }
  }

  async function signOut() {
    if (isSupabaseConfigured) await getSupabase().auth.signOut()
    session.value = null
  }

  return { session, loading, signIn, signUp, signOut }
}
