import { createClient } from 'npm:@supabase/supabase-js@2'
import { assertPublicUrl } from '../_shared/ssrf.ts'
import { resolveProjectUrl, resolveSecretKey } from '../_shared/env.ts'

const BATCH_SIZE = 25
const CONCURRENCY = 5

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
}

interface Delivery {
  id: string
  event_type: string
  channel: { type: string; config: Record<string, string> }
  incident: { cause: string; started_at: string; monitor: { name: string; type: string; config: Record<string, unknown> } }
}

function targetOf(monitor: Delivery['incident']['monitor']) {
  if (monitor.type === 'http') return String(monitor.config.url ?? '')
  return `${monitor.config.host ?? ''}:${monitor.config.port ?? ''}`
}

function buildMessage(delivery: Delivery) {
  const { incident, event_type } = delivery
  const label = event_type === 'recovered' ? 'RESOLVED' : 'DOWN'
  const monitor = incident.monitor
  return [
    `[mone] ${monitor.name} ${label}`,
    `target: ${targetOf(monitor)}`,
    `reason: ${incident.cause}`,
    `since: ${incident.started_at}`,
  ].join('\n')
}

async function sendToChannel(delivery: Delivery, text: string) {
  const config = delivery.channel.config
  if (delivery.channel.type === 'telegram') {
    const url = `https://api.telegram.org/bot${encodeURIComponent(config.bot_token)}/sendMessage`
    await assertPublicUrl(new URL(url))
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: config.chat_id, text }),
    })
    const payload = await response.json().catch(() => ({}) as Record<string, unknown>)
    if (!response.ok || payload.ok === false) throw new Error(`telegram ${response.status}: ${JSON.stringify(payload).slice(0, 200)}`)
    return
  }
  const url = new URL(config.webhook_url)
  await assertPublicUrl(url)
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content: text }),
  })
  if (!response.ok) throw new Error(`discord ${response.status}: ${(await response.text()).slice(0, 200)}`)
}

async function processDelivery(supabase: ReturnType<typeof createClient>, delivery: Delivery) {
  let succeeded = false
  let error: string | null = null
  try {
    await sendToChannel(delivery, buildMessage(delivery))
    succeeded = true
  } catch (cause) {
    error = cause instanceof Error ? cause.message : 'delivery failed'
  }
  const { error: writeError } = await supabase.rpc('record_delivery_result', {
    p_delivery_id: delivery.id,
    p_succeeded: succeeded,
    p_error: error,
  })
  return { deliveryId: delivery.id, succeeded, error: error ?? writeError?.message ?? null }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders })

  const taskToken = Deno.env.get('RUN_DUE_CHECKS_TOKEN')
  const authorization = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!taskToken || authorization !== taskToken) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'content-type': 'application/json' } })
  }

  const url = resolveProjectUrl()
  const serviceRoleKey = resolveSecretKey()
  if (!url || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Supabase environment is not configured' }), { status: 500, headers: { ...corsHeaders, 'content-type': 'application/json' } })
  }

  const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: claimed, error: claimError } = await supabase.rpc('claim_pending_deliveries', { p_limit: BATCH_SIZE })
  if (claimError) {
    return new Response(JSON.stringify({ error: claimError.message }), { status: 500, headers: { ...corsHeaders, 'content-type': 'application/json' } })
  }

  const ids = (claimed ?? []).map((row: { id: string }) => row.id)
  if (!ids.length) {
    return new Response(JSON.stringify({ claimed: 0, sent: 0, deferred: 0, results: [] }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
  }

  const { data: deliveries, error: loadError } = await supabase
    .from('notification_deliveries')
    .select('id, event_type, channel:notification_channels(type, config), incident:incidents(cause, started_at, monitor:monitors(name, type, config))')
    .in('id', ids)
  if (loadError) {
    return new Response(JSON.stringify({ error: loadError.message }), { status: 500, headers: { ...corsHeaders, 'content-type': 'application/json' } })
  }

  const results: Awaited<ReturnType<typeof processDelivery>>[] = []
  const list = (deliveries ?? []) as unknown as Delivery[]
  for (let index = 0; index < list.length; index += CONCURRENCY) {
    results.push(...await Promise.all(list.slice(index, index + CONCURRENCY).map((delivery) => processDelivery(supabase, delivery))))
  }

  return new Response(JSON.stringify({
    claimed: ids.length,
    sent: results.filter((item) => item.succeeded).length,
    deferred: results.filter((item) => !item.succeeded).length,
    results,
  }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
})
