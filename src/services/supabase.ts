import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anonKey)

/** Mock data is a local development convenience, never something a visitor can be served. */
export const isDemoMode = !isSupabaseConfigured
  && (import.meta.env.DEV || import.meta.env.VITE_DEMO_MODE === 'true')

/** A production build without credentials has no data source to fall back on. */
export const isMisconfigured = !isSupabaseConfigured && !isDemoMode

let client: SupabaseClient | null = null

export function getSupabase() {
  if (!url || !anonKey) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
  }
  if (!client) {
    client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return client
}
