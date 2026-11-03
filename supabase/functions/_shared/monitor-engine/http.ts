import type { CheckResult, HttpConfig } from '../types.ts'
import { assertPublicUrl } from '../ssrf.ts'

const MAX_BODY_BYTES = 256 * 1024

async function readLimitedBody(response: Response): Promise<number> {
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
}

function expected(status: number, codes: number[]) {
  return codes.length === 0 ? status >= 200 && status < 300 : codes.includes(status)
}

export async function checkHttp(config: HttpConfig): Promise<CheckResult> {
  const started = performance.now()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), Math.min(Math.max(config.timeout_ms, 1000), 30000))
  let current = new URL(config.url)
  try {
    for (let hop = 0; hop <= 5; hop++) {
      await assertPublicUrl(current)
      const response = await fetch(current, {
        method: config.method,
        headers: config.headers,
        body: ['GET', 'HEAD'].includes(config.method.toUpperCase()) ? undefined : config.body || undefined,
        redirect: 'manual',
        signal: controller.signal,
      })
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location')
        if (!location) throw new Error('Redirect response is missing a Location header')
        current = new URL(location, current)
        continue
      }
      const bytes = await readLimitedBody(response)
      const responseTimeMs = Math.round(performance.now() - started)
      const passed = expected(response.status, config.expected_status_codes ?? [])
      return {
        status: passed ? 'up' : 'down',
        responseTimeMs,
        statusCode: response.status,
        errorMessage: passed ? undefined : `Expected HTTP ${config.expected_status_codes.join(', ') || '2xx'}, received ${response.status}`,
        metadata: { response_bytes: bytes },
      }
    }
    throw new Error('Too many redirects')
  } catch (cause) {
    return {
      status: 'down',
      responseTimeMs: Math.round(performance.now() - started),
      errorMessage: cause instanceof Error ? (cause.name === 'AbortError' ? `Request timed out after ${config.timeout_ms} ms` : cause.message) : 'Unknown HTTP check failure',
    }
  } finally {
    clearTimeout(timeout)
  }
}
