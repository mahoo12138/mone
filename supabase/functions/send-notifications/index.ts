import { createClient } from 'npm:@supabase/supabase-js@2'
import { deliver, incidentMessage } from '../_shared/notifiers.ts'
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

async function processDelivery(supabase: ReturnType<typeof createClient>, delivery: Delivery) {
  let succeeded = false
  let error: string | null = null
  try {
    await deliver(delivery.channel, incidentMessage({
      monitorName: delivery.incident.monitor.name,
      target: targetOf(delivery.incident.monitor),
      event: delivery.event_type,
      cause: delivery.incident.cause,
      startedAt: delivery.incident.started_at,
    }))
    succeeded = true
  } catch (cause) {
    const frame = cause instanceof Error ? (cause.stack?.split('\n')[1] ?? '').trim() : ''
    error = cause instanceof Error
      ? `${cause.message}${frame ? ` @ ${frame}` : ''}`
      : 'delivery failed'
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

  const list = (deliveries ?? []) as unknown as Delivery[]
  const results: Awaited<ReturnType<typeof processDelivery>>[] = []
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
