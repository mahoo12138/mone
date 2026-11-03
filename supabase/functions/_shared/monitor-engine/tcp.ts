import type { CheckResult, TcpConfig } from '../types.ts'
import { resolvePublicAddresses } from '../ssrf.ts'

export async function checkTcp(config: TcpConfig): Promise<CheckResult> {
  const started = performance.now()
  const timeout = Math.min(Math.max(config.timeout_ms, 1000), 30000)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    await resolvePublicAddresses(config.host, config.port)
    const connection = await Deno.connect({
      hostname: config.host,
      port: config.port,
      signal: controller.signal,
    })
    connection.close()
    return { status: 'up', responseTimeMs: Math.round(performance.now() - started) }
  } catch (cause) {
    return {
      status: 'down',
      responseTimeMs: Math.round(performance.now() - started),
      errorMessage: cause instanceof Error ? (cause.name === 'AbortError' ? `TCP connection timed out after ${timeout} ms` : cause.message) : 'TCP connection failed',
    }
  } finally {
    clearTimeout(timer)
  }
}
