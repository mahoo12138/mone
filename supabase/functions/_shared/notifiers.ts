import { assertPublicUrl } from './ssrf.ts'
import { sendMail } from './smtp.ts'

interface ChannelConfig {
  type: string
  config: Record<string, string>
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character]!)
}

function emailHtml(text: string): string {
  const body = escapeHtml(text).replace(/\n/g, '<br>')
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#f7f6f1;padding:28px 16px">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e2e0d8;border-radius:14px;padding:24px">
    <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#14261f">mone. 监控告警</p>
    <p style="margin:0;font-size:14px;line-height:1.8;color:#1c1b17">${body}</p>
  </div>
</div>`
}

async function sendEmail(to: string, text: string): Promise<void> {
  const host = Deno.env.get('SMTP_HOST')
  const port = Number(Deno.env.get('SMTP_PORT') ?? '587')
  const username = Deno.env.get('SMTP_USER')
  const password = Deno.env.get('SMTP_PASS')
  const from = Deno.env.get('SMTP_FROM')
  if (!host || !username || !password || !from) {
    throw new Error('SMTP is not configured on the server (SMTP_HOST/SMTP_USER/SMTP_PASS/SMTP_FROM)')
  }
  const subject = text.split('\n')[0] || 'Mone notification'
  await sendMail({ host, port, username, password, from, fromName: 'Mone' }, to, subject, text, emailHtml(text))
}

/**
 * Sends `text` through the channel and throws when the provider does not accept it.
 * Outbound URLs from user-configured channels are SSRF-validated like every other probe target.
 */
export async function deliver(channel: ChannelConfig, text: string): Promise<void> {
  if (channel.type === 'email') {
    await sendEmail(channel.config.to, text)
    return
  }
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
