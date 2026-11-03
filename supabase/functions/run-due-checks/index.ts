import { createClient } from 'npm:@supabase/supabase-js@2'
import type { MonitorRecord } from '../_shared/types.ts'
import { runCheck } from '../_shared/monitor-engine/index.ts'
import { resolveProjectUrl, resolveSecretKey } from '../_shared/env.ts'

const BATCH_SIZE = 20
const CONCURRENCY = 5
const LEASE_SECONDS = 120

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
}

async function releaseLease(supabase: ReturnType<typeof createClient>, monitorId: string) {
  await supabase.from('monitors').update({ lease_until: null }).eq('id', monitorId)
}

async function processMonitor(supabase: ReturnType<typeof createClient>, monitor: MonitorRecord) {
  try {
    const result = await runCheck(monitor)
    const { error } = await supabase.rpc('record_check_result', {
      p_monitor_id: monitor.id,
      p_status: result.status,
      p_response_time_ms: result.responseTimeMs,
      p_status_code: result.statusCode ?? null,
      p_error_message: result.errorMessage ?? null,
      p_metadata: result.metadata ?? {},
    })
    if (error) await releaseLease(supabase, monitor.id)
    return { monitorId: monitor.id, status: error ? 'write_failed' : result.status, error: error?.message }
  } catch (cause) {
    await releaseLease(supabase, monitor.id)
    return { monitorId: monitor.id, status: 'probe_failed', error: cause instanceof Error ? cause.message : 'Unknown probe failure' }
  }
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
  const { data: claimed, error: claimError } = await supabase.rpc('claim_due_monitors', {
    p_limit: BATCH_SIZE,
    p_lease_seconds: LEASE_SECONDS,
  })
  if (claimError) {
    return new Response(JSON.stringify({ error: claimError.message }), { status: 500, headers: { ...corsHeaders, 'content-type': 'application/json' } })
  }

  const monitors = (claimed ?? []) as MonitorRecord[]
  const results: Awaited<ReturnType<typeof processMonitor>>[] = []
  for (let index = 0; index < monitors.length; index += CONCURRENCY) {
    results.push(...await Promise.all(monitors.slice(index, index + CONCURRENCY).map((monitor) => processMonitor(supabase, monitor))))
  }

  return new Response(JSON.stringify({
    claimed: monitors.length,
    succeeded: results.filter((item) => item.status === 'up').length,
    failed: results.filter((item) => item.status === 'down' || item.status === 'probe_failed' || item.status === 'write_failed').length,
    results,
  }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
})
