import { createClient } from 'npm:@supabase/supabase-js@2'
import { resolveProjectUrl, resolveSecretKey } from '../_shared/env.ts'

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

  const taskToken = Deno.env.get('RUN_DUE_CHECKS_TOKEN')
  const authorization = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!taskToken || authorization !== taskToken) return json({ error: 'Unauthorized' }, 401)

  const url = resolveProjectUrl()
  const serviceRoleKey = resolveSecretKey()
  if (!url || !serviceRoleKey) return json({ error: 'Supabase environment is not configured' }, 500)

  const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await supabase.rpc('run_data_retention', {})
  if (error) return json({ error: error.message }, 500)

  return json(data)
})
