import { createClient } from 'npm:@supabase/supabase-js@2'

function parseIpv4(value: string): number[] | null {
  const parts = value.split('.')
  if (parts.length !== 4) return null
  const octets = parts.map(Number)
  return octets.every((part) => Number.isInteger(part) && part >= 0 && part <= 255) ? octets : null
}
function ipv4ToNumber(octets: number[]) {
  return octets.reduce((value, octet) => (value << 8) + octet, 0) >>> 0
}
function inIpv4Cidr(ip: number, cidr: string) {
  const [network, bitsText] = cidr.split('/')
  const bits = Number(bitsText)
  const networkOctets = parseIpv4(network)
  if (!networkOctets) return false
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0
  return (ip & mask) === (ipv4ToNumber(networkOctets) & mask)
}
function ipv6Groups(value: string): number[] | null {
  const address = value.toLowerCase().replace(/^\[|\]$/g, '')
  const embedded = address.match(/:(\d+\.\d+\.\d+\.\d+)$/)
  let tail: number[] | null = null
  let working = address
  if (embedded) {
    tail = parseIpv4(embedded[1])
    if (!tail) return null
    working = address.slice(0, address.lastIndexOf(':'))
  }
  const halves = working.split('::')
  if (halves.length > 2) return null
  const expand = (part: string) => part ? part.split(':').map((group) => Number.parseInt(group, 16)) : []
  const left = expand(halves[0])
  const right = halves.length === 2 ? expand(halves[1]) : []
  const groups = tail ? [...right, tail[0] >> 16, tail[1] & 0xffff] : right
  if (halves.length === 1) return left.length === 8 && left.every(Number.isFinite) ? left : null
  const fill = 8 - left.length - groups.length
  if (fill < 0) return null
  const result = [...left, ...Array(fill).fill(0), ...groups]
  return result.length === 8 && result.every((group) => Number.isFinite(group) && group >= 0 && group <= 0xffff) ? result : null
}
function inIpv6Cidr(groups: number[], prefix: number[], bits: number) {
  for (let index = 0; index < 8; index++) {
    const remaining = bits - index * 16
    if (remaining <= 0) break
    const mask = remaining >= 16 ? 0xffff : (0xffff << (16 - remaining)) & 0xffff
    if ((groups[index] & mask) !== (prefix[index] & mask)) return false
  }
  return true
}
function isBlockedIp(ip: string) {
  const v4 = parseIpv4(ip)
  if (v4) {
    const value = ipv4ToNumber(v4)
    return ['0.0.0.0/8', '10.0.0.0/8', '100.64.0.0/10', '127.0.0.0/8', '169.254.0.0/16', '172.16.0.0/12', '192.0.0.0/24', '192.0.2.0/24', '198.18.0.0/15', '198.51.100.0/24', '203.0.113.0/24', '224.0.0.0/4', '240.0.0.0/4'].some((cidr) => inIpv4Cidr(value, cidr))
  }
  const groups = ipv6Groups(ip)
  if (!groups) return true
  return [[[0,0,0,0,0,0,0,0],128],[[0,0,0,0,0,0,0,1],128],[[0,0,0,0,0,0xffff,0,0],104],[[0xfe80,0,0,0,0,0,0,0],10],[[0xfc00,0,0,0,0,0,0,0],7],[[0xff00,0,0,0,0,0,0,0],8]].some(([prefix, bits]: [number[], number]) => inIpv6Cidr(groups, prefix, bits))
}
async function resolvePublicAddresses(hostname: string, port: number) {
  if (parseIpv4(hostname) || ipv6Groups(hostname)) {
    if (isBlockedIp(hostname)) throw new Error('Private or reserved IP addresses are not allowed')
    return [hostname]
  }
  const records = (await Promise.allSettled([Deno.resolveDns(hostname, 'A'), Deno.resolveDns(hostname, 'AAAA')]))
    .flatMap((record) => record.status === 'fulfilled' ? record.value : [])
  if (!records.length) throw new Error(`Unable to resolve ${hostname}`)
  const blocked = records.filter(isBlockedIp)
  if (blocked.length) throw new Error(`Target resolves to a private or reserved address: ${blocked[0]}`)
  if (port <= 0 || port > 65535) throw new Error('Port must be between 1 and 65535')
  return records
}
async function assertPublicUrl(url: URL) {
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only HTTP and HTTPS URLs are allowed')
  if (!url.hostname) throw new Error('URL must include a hostname')
  const port = Number(url.port || (url.protocol === 'https:' ? 443 : 80))
  return resolvePublicAddresses(url.hostname, port)
}
async function readLimitedBody(response: Response) {
  if (!response.body) return 0
  const reader = response.body.getReader()
  let received = 0
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    received += value.byteLength
    if (received > MAX_BODY_BYTES) {
      await reader.cancel()
      throw new Error(`Response body exceeds ${MAX_BODY_BYTES} bytes`)
    }
  }
  return received
}// publishable/secret key scheme; `SUPABASE_SERVICE_ROLE_KEY` only exists on legacy-key projects.
function resolveProjectUrl(): string | undefined {
  return Deno.env.get('SUPABASE_URL') ?? 'https://ibnggtllzkvcbxwyfiub.supabase.co'
}

function resolveSecretKey(): string | undefined {
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

  const url = Deno.env.get('SUPABASE_URL') ?? 'https://ibnggtllzkvcbxwyfiub.supabase.co'
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

