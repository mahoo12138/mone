import { assertPublicUrl } from './ssrf.ts'

interface ChannelConfig {
  type: string
  config: Record<string, string>
}

/**
 * Sends `text` through the channel and throws when the provider does not accept it.
 * Outbound URLs from user-configured channels are SSRF-validated like every other probe target.
 */
export async function deliver(channel: ChannelConfig, text: string): Promise<void> {
  if (channel.type === 'telegram') {
    const url = `https://api.telegram.org/bot${encodeURIComponent(channel.config.bot_token)}/sendMessage`
    await assertPublicUrl(new URL(url))
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: channel.config.chat_id, text }),
    })
    const payload = await response.json().catch(() => ({}) as Record<string, unknown>)
    if (!response.ok || payload.ok === false) {
      throw new Error(`telegram ${response.status}: ${JSON.stringify(payload).slice(0, 200)}`)
    }
    return
  }

  const url = new URL(channel.config.webhook_url)
  await assertPublicUrl(url)
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content: text }),
  })
  if (!response.ok) {
    throw new Error(`${channel.type} ${response.status}: ${(await response.text()).slice(0, 200)}`)
  }
}

export function incidentMessage(input: {
  monitorName: string
  target: string
  event: string
  cause: string
  startedAt: string
}) {
  const label = input.event === 'recovered' ? 'RESOLVED' : 'DOWN'
  return [
    `[mone] ${input.monitorName} ${label}`,
    `target: ${input.target}`,
    `reason: ${input.cause}`,
    `since: ${input.startedAt}`,
  ].join('\n')
}
