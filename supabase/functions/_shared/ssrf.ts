function parseIpv4(value: string): number[] | null {
  const parts = value.split('.')
  if (parts.length !== 4) return null
  const octets = parts.map(Number)
  return octets.every((part) => Number.isInteger(part) && part >= 0 && part <= 255) ? octets : null
}

function ipv4ToNumber(octets: number[]): number {
  return octets.reduce((value, octet) => (value << 8) + octet, 0) >>> 0
}

function inIpv4Cidr(ip: number, cidr: string): boolean {
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
  if (halves.length === 1) return left.length === 8 && left.every((group) => Number.isFinite(group)) ? left : null
  const fill = 8 - left.length - groups.length
  if (fill < 0) return null
  const result = [...left, ...Array(fill).fill(0), ...groups]
  return result.length === 8 && result.every((group) => Number.isFinite(group) && group >= 0 && group <= 0xffff) ? result : null
}

function inIpv6Cidr(groups: number[], prefix: number[], bits: number): boolean {
  for (let index = 0; index < 8; index++) {
    const remaining = bits - index * 16
    if (remaining <= 0) break
    const mask = remaining >= 16 ? 0xffff : (0xffff << (16 - remaining)) & 0xffff
    if ((groups[index] & mask) !== (prefix[index] & mask)) return false
  }
  return true
}

export function isBlockedIp(ip: string): boolean {
  const v4 = parseIpv4(ip)
  if (v4) {
    const value = ipv4ToNumber(v4)
    const blocked = ['0.0.0.0/8', '10.0.0.0/8', '100.64.0.0/10', '127.0.0.0/8', '169.254.0.0/16', '172.16.0.0/12', '192.0.0.0/24', '192.0.2.0/24', '198.18.0.0/15', '198.51.100.0/24', '203.0.113.0/24', '224.0.0.0/4', '240.0.0.0/4']
    return blocked.some((cidr) => inIpv4Cidr(value, cidr))
  }

  const groups = ipv6Groups(ip)
  if (!groups) return true
  const blocked: Array<[number[], number]> = [
    [[0, 0, 0, 0, 0, 0, 0, 0], 128],
    [[0, 0, 0, 0, 0, 0, 0, 1], 128],
    [[0, 0, 0, 0, 0, 0xffff, 0, 0], 104],
    [[0xfe80, 0, 0, 0, 0, 0, 0, 0], 10],
    [[0xfc00, 0, 0, 0, 0, 0, 0, 0], 7],
    [[0xff00, 0, 0, 0, 0, 0, 0, 0], 8],
  ]
  return blocked.some(([prefix, bits]) => inIpv6Cidr(groups, prefix, bits))
}

export async function resolvePublicAddresses(hostname: string, port: number): Promise<string[]> {
  if (parseIpv4(hostname)) {
    if (isBlockedIp(hostname)) throw new Error('Private or reserved IP addresses are not allowed')
    return [hostname]
  }
  const groups = ipv6Groups(hostname)
  if (groups) {
    if (isBlockedIp(hostname)) throw new Error('Private or reserved IP addresses are not allowed')
    return [hostname]
  }

  const records = (await Promise.allSettled([
    Deno.resolveDns(hostname, 'A'),
    Deno.resolveDns(hostname, 'AAAA'),
  ])).flatMap((record) => record.status === 'fulfilled' ? record.value : [])
  if (!records.length) throw new Error(`Unable to resolve ${hostname}`)
  const blocked = records.filter(isBlockedIp)
  if (blocked.length) throw new Error(`Target resolves to a private or reserved address: ${blocked[0]}`)
  if (port <= 0 || port > 65535) throw new Error('Port must be between 1 and 65535')
  return records
}

export async function assertPublicUrl(url: URL): Promise<string[]> {
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only HTTP and HTTPS URLs are allowed')
  if (!url.hostname) throw new Error('URL must include a hostname')
  const port = Number(url.port || (url.protocol === 'https:' ? 443 : 80))
  if (port <= 0 || port > 65535) throw new Error('Port must be between 1 and 65535')
  return resolvePublicAddresses(url.hostname, port)
}
