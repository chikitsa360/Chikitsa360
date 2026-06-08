import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Validates the HMAC-SHA256 signature on an inbound Meta webhook request.
 *
 * Meta sends: X-Hub-Signature-256: sha256=<hex>
 * We verify: HMAC-SHA256(APP_SECRET, rawBody) === signature
 *
 * Also validates timestamp to prevent replay attacks (max 5 min old).
 */
export function validateWebhookSignature(
  rawBody: string,
  signatureHeader: string,
  appSecret: string,
  timestampHeader?: string,
): boolean {
  if (!signatureHeader.startsWith('sha256=')) return false

  // Replay attack protection: reject if > 5 minutes old
  if (timestampHeader) {
    const ts = parseInt(timestampHeader, 10)
    if (isNaN(ts)) return false
    const ageSeconds = Math.floor(Date.now() / 1000) - ts
    if (ageSeconds > 300) return false
  }

  const expected = createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex')

  const receivedHex = signatureHeader.slice('sha256='.length)

  // Constant-time comparison to prevent timing attacks
  try {
    const expectedBuf = Buffer.from(expected, 'hex')
    const receivedBuf = Buffer.from(receivedHex, 'hex')
    if (expectedBuf.length !== receivedBuf.length) return false
    return timingSafeEqual(expectedBuf, receivedBuf)
  } catch {
    return false
  }
}

/**
 * Registers a webhook URL with Meta's WhatsApp Cloud API.
 */
export async function registerWebhook(
  phoneNumberId: string,
  webhookUrl: string,
  verifyToken: string,
  accessToken: string,
): Promise<{ success: boolean; error?: string }> {
  const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/subscribed_apps`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        callback_url: webhookUrl,
        verify_token: verifyToken,
        fields: ['messages', 'message_deliveries', 'message_reads'],
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return { success: false, error: data?.error?.message ?? 'Webhook registration failed' }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error' }
  }
}

/**
 * Sends a WhatsApp template message via Meta Cloud API.
 */
export async function sendTemplateMessage(
  phoneNumberId: string,
  to: string,
  templateName: string,
  languageCode: string,
  components: object[],
  accessToken: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components,
        },
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      return { success: false, error: data?.error?.message ?? 'Message send failed' }
    }

    return { success: true, messageId: data?.messages?.[0]?.id }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error' }
  }
}
