// Supabase injects `SUPABASE_SECRET_KEYS` (JSON array) for projects on the v2
// publishable/secret key scheme; `SUPABASE_SERVICE_ROLE_KEY` only exists on legacy-key projects.
export function resolveProjectUrl(): string | undefined {
  return Deno.env.get('SUPABASE_URL') ?? 'https://ibnggtllzkvcbxwyfiub.supabase.co'
}

export function resolveSecretKey(): string | undefined {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (legacy) return legacy
  const raw = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (!raw) return undefined
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return undefined
  }
  const entries = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object'
      ? Object.values(parsed)
      : []
  for (const entry of entries) {
    const value = typeof entry === 'string' ? entry : (entry as { value?: unknown })?.value
    if (typeof value === 'string' && value.startsWith('sb_secret_')) return value
  }
  return undefined
}
