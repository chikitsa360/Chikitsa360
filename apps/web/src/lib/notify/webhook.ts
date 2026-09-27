import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Verification + translation helpers for the Notify webhook bridge
 * (/api/webhooks/notify/[clinicId]). Kept out of the route file so they can
 * be unit-tested (Next.js only allows handler exports from route.ts).
 */

const REPLAY_WINDOW_SECONDS = 300

/**
 * Verifies Notify's Stripe-style signature header:
 *   X-Notify-Signature: t=<unix-seconds>,v1=<hex hmac>
 * where hmac = HMAC-SHA256(secret, `${t}.${rawBody}`). The timestamp is part
 * of the signed material; stale timestamps (> 5 min) are rejected to block
 * replays — mirroring the Meta webhook's protection.
 */
export function verifyNotifySignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000)
): boolean {
  const parts = signatureHeader.split(',')
  const tPart = parts.find((p) => p.startsWith('t='))
  const v1Part = parts.find((p) => p.startsWith('v1='))
  if (!tPart || !v1Part) return false

  const timestamp = parseInt(tPart.slice(2), 10)
  if (isNaN(timestamp) || Math.abs(nowSeconds - timestamp) > REPLAY_WINDOW_SECONDS) return false

  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')
  const received = v1Part.slice(3)

  try {
    const expectedBuf = Buffer.from(expected, 'hex')
    const receivedBuf = Buffer.from(received, 'hex')
    if (expectedBuf.length !== receivedBuf.length) return false
    return timingSafeEqual(expectedBuf, receivedBuf)
  } catch {
    return false
  }
}

/** Notify's InboundReply shape, spread into the 'reply' event's data. */
export interface NotifyReplyData {
  from?: string
  messageId?: string
  type?: 'button' | 'text' | 'list'
  buttonId?: string
  buttonTitle?: string
  listRowId?: string
  listRowTitle?: string
  text?: string
  rawPayload?: { timestamp?: string }
}

/** Notify's NotifyEvent shape, spread into sent/delivered/read/failed events. */
export interface NotifyStatusData {
  id?: string
  to?: string
  waMessageId?: string
  status?: string
  error?: string
}

export interface NotifyWebhookBody {
  event?: string
  data?: NotifyReplyData | NotifyStatusData
}

export interface InngestEvent {
  id: string
  name: string
  data: Record<string, unknown>
}

const STATUS_EVENTS = new Set(['sent', 'delivered', 'read', 'failed'])

/**
 * Translates a Notify webhook event into the exact Inngest event the direct
 * Meta webhook emits (whatsapp/message.received | whatsapp/status.update),
 * with the same dedup-id shapes — so all downstream Inngest functions run
 * unchanged regardless of transport.
 */
export function translateToInngestEvent(
  eventName: string,
  data: NotifyReplyData | NotifyStatusData | undefined,
  phoneNumberId: string
): InngestEvent | null {
  if (!data) return null

  if (eventName === 'reply') {
    const reply = data as NotifyReplyData
    if (!reply.messageId || !reply.from) return null

    const isInteractive = reply.type === 'button' || reply.type === 'list'
    return {
      id: reply.messageId, // same dedup key as the direct Meta webhook
      name: 'whatsapp/message.received',
      data: {
        messageId: reply.messageId,
        phoneNumberId,
        patientPhone: reply.from,
        messageType: isInteractive ? 'interactive' : 'text',
        messageBody: reply.text ?? null,
        interactiveType:
          reply.type === 'button' ? 'button_reply' : reply.type === 'list' ? 'list_reply' : null,
        interactiveId: reply.buttonId ?? reply.listRowId ?? null,
        interactiveTitle: reply.buttonTitle ?? reply.listRowTitle ?? null,
        timestamp: reply.rawPayload?.timestamp ?? String(Math.floor(Date.now() / 1000)),
      },
    }
  }

  if (STATUS_EVENTS.has(eventName)) {
    const status = data as NotifyStatusData
    // waMessageId is the Meta wamid the send path stored in Redis — without it
    // there is nothing to correlate (the status handler would no-op anyway)
    const messageId = status.waMessageId ?? status.id
    if (!messageId) return null

    return {
      id: `${messageId}:${eventName}`, // same dedup key shape as the Meta webhook
      name: 'whatsapp/status.update',
      data: {
        messageId,
        recipientId: status.to ?? '',
        status: eventName,
        timestamp: String(Math.floor(Date.now() / 1000)),
      },
    }
  }

  return null
}
