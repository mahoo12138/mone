interface SmtpOptions {
  host: string
  port: number
  username: string
  password: string
  from: string
  fromName?: string
  replyTo?: string
}

const encoder = new TextEncoder()
const MAX_REPLY_BYTES = 64 * 1024

function b64(value: string): string {
  const bytes = encoder.encode(value)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

/**
 * Minimal SMTP client for the Supabase edge runtime.
 *
 * It deliberately uses only Deno.connect + Deno.startTls, because those are the socket APIs
 * verified to work there: node:tls completes a handshake but its getPeerCertificate() returns
 * neither validity dates nor the DER, and nodemailer additionally needs node:dns, which the
 * runtime does not provide.
 */
export async function sendMail(options: SmtpOptions, to: string, subject: string, text: string, html: string): Promise<void> {
  // A stalled socket would otherwise hang the invocation until the platform kills it,
  // which leaves the delivery claimed with no recorded result.
  const deadline = Date.now() + 45_000
  const withDeadline = async <T>(action: Promise<T>, label: string): Promise<T> => {
    const remaining = deadline - Date.now()
    if (remaining <= 0) throw new Error(`SMTP ${label} skipped: 45s budget exhausted`)
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      return await Promise.race([
        action,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error(`SMTP ${label} timed out after ${Math.round(remaining / 1000)}s`)), remaining)
        }),
      ])
    } finally {
      if (timer !== undefined) clearTimeout(timer)
    }
  }

  const connection = await withDeadline(Deno.connect({ hostname: options.host, port: options.port }) as Promise<Deno.TcpConn>, 'connect')
  let tls: Deno.TlsConn | undefined
  let socket: Deno.Conn = connection
  let buffer = new Uint8Array(0)

  const write = async (data: string) => {
    await withDeadline(socket.write(encoder.encode(data)), 'write')
  }

  let step = 'greeting'
  const readChunk = async (): Promise<{ value?: Uint8Array; done: boolean }> =>
    withDeadline(socket.read(new Uint8Array(4096)), 'read(' + step)

  const readReply = async (): Promise<string> => {
    for (;;) {
      const text = new TextDecoder().decode(buffer)
      // A reply ends with a line whose status code is followed by a space, not "-".
      // EHLO/HELO replies are multi-line, so the match is not always at offset 0.
      const match = text.match(/^(\d{3}) [^\r\n]*\r\n/m)
      if (match) {
        buffer = buffer.subarray((match.index ?? 0) + match[0].length)
        return match[1]
      }
      const { value, done } = await readChunk()
      if (done && !value) throw new Error(`SMTP connection closed while waiting for a reply (last: ${text.slice(-200)})`)
      if (!value || value.length === 0) continue
      const next = new Uint8Array(buffer.length + value.length)
      next.set(buffer)
      next.set(value, buffer.length)
      buffer = next
      if (buffer.length > MAX_REPLY_BYTES) throw new Error('SMTP reply exceeded 64 KB')
    }
  }

  const command = async (line: string, expected: string) => {
    step = line.split(' ')[0]
    await write(`${line}\r\n`)
    const code = await readReply()
    if (code !== expected) throw new Error(`SMTP "${line.split(' ')[0]}" returned ${code}, expected ${expected}`)
    return code
  }

  try {
    step = 'greeting'
    await readReply()
    await command(`EHLO ${Deno.hostname()}`, '250')

    await command('STARTTLS', '220')
    step = 'post-STARTTLS'
    tls = await Deno.startTls(socket, { hostname: options.host })
    socket = tls
    buffer = new Uint8Array(0)

    await command(`EHLO ${Deno.hostname()}`, '250')
    await command('AUTH LOGIN', '334')
    step = 'auth-challenge'
    await write(`${b64(options.username)}\r\n`)
    if (await readReply() !== '334') throw new Error('SMTP server did not accept the username step')
    await write(`${b64(options.password)}\r\n`)
    step = 'auth-credentials'
    if (await readReply() !== '235') throw new Error('SMTP authentication failed (check the QQ authorization code)')

    const boundary = `mone-${crypto.randomUUID()}`
    const headers = [
      `From: ${options.fromName ? `"${options.fromName}" ` : ''}<${options.from}>`,
      `To: <${to}>`,
      `Subject: ${subject}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${crypto.randomUUID()}@mone>`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ]
    if (options.replyTo) headers.push(`Reply-To: ${options.replyTo}`)

    const body = [
      `--${boundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      '',
      text,
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      '',
      html,
      `--${boundary}--`,
    ].join('\r\n')

    await command(`MAIL FROM:<${options.from}>`, '250')
    await command(`RCPT TO:<${to}>`, '250')
    await command('DATA', '354')
    step = 'data-body'
    await write(`${headers.join('\r\n')}\r\n\r\n${body.replace(/\r\n\./g, '\r\n..')}\r\n.\r\n`)
    if (await readReply() !== '250') throw new Error('SMTP server rejected the message data')

    try {
      await write('QUIT\r\n')
    } catch {
      // The socket may already be closing; the message is accepted at this point.
    }
  } finally {
    try {
      if (tls) tls.close()
      else connection.close()
    } catch {
      // startTls takes ownership of the socket, so closing both handles throws.
    }
  }
}
