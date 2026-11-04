import { createClient } from 'npm:@supabase/supabase-js@2'
import { deliver } from '../_shared/notifiers.ts'
import { resolveProjectUrl, resolvePublishableKey, resolveSecretKey } from '../_shared/env.ts'

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'content-type': 'application/json' } })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const url = resolveProjectUrl()
  const publishableKey = resolvePublishableKey()
  const serviceRoleKey = resolveSecretKey()
  if (!url || !publishableKey || !serviceRoleKey) return json({ error: 'Supabase environment is not configured' }, 500)

  // The gateway already checked the JWT; this resolves the caller so ownership can be enforced.
  // supabase-js overwrites a lowercase `authorization` with its own (empty) session header,
  // so the caller's token must be passed as `Authorization`.
  const userClient = createClient(url, publishableKey, {
    global: { headers: { Authorization: request.headers.get('authorization') ?? '' } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData.user) return json({ error: 'Unauthorized' }, 401)

  const { channel_id: channelId } = await request.json().catch(() => ({ channel_id: null }))
  if (!channelId) return json({ error: 'channel_id is required' }, 400)

  const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: channel, error: loadError } = await supabase
    .from('notification_channels')
    .select('id, name, type, config, enabled')
    .eq('id', channelId)
    .eq('user_id', userData.user.id)
    .single()
  if (loadError || !channel) return json({ error: 'Channel not found' }, 404)
  if (!channel.enabled) return json({ error: 'Channel is disabled' }, 400)

  const text = `[mone] Test notification\nchannel: ${channel.name}\nThis message verifies your delivery settings.`
  try {
    await deliver({ type: channel.type, config: channel.config }, text)
  } catch (cause) {
    return json({ ok: false, error: cause instanceof Error ? cause.message : 'delivery failed' }, 502)
  }
  return json({ ok: true })
})
