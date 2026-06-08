import { NextRequest, NextResponse } from 'next/server'
import { validateWebhookSignature } from '@/lib/meta-whatsapp'
import { inngest } from '@/lib/inngest'

/**
 * GET /api/webhooks/whatsapp
 * Meta webhook verification challenge.
 */
export async function GET(req: NextRequest) {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN ?? ''
  const mode = req.nextUrl.searchParams.get('hub.mode')
  const token = req.nextUrl.searchParams.get('hub.verify_token')
  const challenge = req.nextUrl.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === verifyToken && challenge) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

interface MetaMessage {
  from: string
  id: string
  timestamp: string
  type: string
  text?: { body: string }
  interactive?: {
    type: string
    button_reply?: { id: string; title: string }
    list_reply?: { id: string; title: string; description?: string }
  }
}

interface MetaStatus {
  id: string
  recipient_id: string
  status: string
  timestamp: string
}

interface MetaWebhookPayload {
  object?: string
  entry?: Array<{
    id?: string
    changes?: Array<{
      field?: string
      value?: {
        metadata?: { phone_number_id?: string; display_phone_number?: string }
        messages?: MetaMessage[]
        statuses?: MetaStatus[]
      }
    }>
  }>
}

/**
 * POST /api/webhooks/whatsapp
 * Inbound WhatsApp messages — HMAC-SHA256 validated.
 * Returns 200 immediately; all processing is async via Inngest.
 */
export async function POST(req: NextRequest) {
  const appSecret = process.env.META_APP_SECRET ?? ''
  const rawBody = await req.text()
  const signature = req.headers.get('x-hub-signature-256') ?? ''
  const timestamp = req.headers.get('x-hub-timestamp') ?? undefined

  if (!appSecret || !validateWebhookSignature(rawBody, signature, appSecret, timestamp)) {
    // Security audit log — structured for log aggregation
    console.error(
      JSON.stringify({
        action: 'WEBHOOK_SIGNATURE_INVALID',
        resource_type: 'whatsapp_webhook',
        timestamp: new Date().toISOString(),
      })
    )
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
  }

  try {
    const payload = JSON.parse(rawBody) as MetaWebhookPayload
    const events = extractInngestEvents(payload)
    for (const ev of events) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await inngest.send(ev as any)
    }
  } catch {
    // JSON parse error or Inngest error — still return 200 to prevent Meta retries
  }

  return NextResponse.json({ ok: true })
}

interface InngestEvent {
  id: string
  name: string
  data: Record<string, unknown>
}

function extractInngestEvents(payload: MetaWebhookPayload): InngestEvent[] {
  const events: InngestEvent[] = []

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'messages') continue

      const value = change.value
      const phoneNumberId = value?.metadata?.phone_number_id ?? ''

      // Inbound messages → whatsapp/message.received (one event per message, idempotent by messageId)
      for (const message of value?.messages ?? []) {
        events.push({
          id: message.id, // Inngest dedup key — prevents double processing on Meta retry
          name: 'whatsapp/message.received' as const,
          data: {
            messageId: message.id,
            phoneNumberId,
            patientPhone: message.from,
            messageType: message.type,
            messageBody: message.text?.body ?? null,
            interactiveType: message.interactive?.type ?? null,
            interactiveId:
              message.interactive?.button_reply?.id ??
              message.interactive?.list_reply?.id ??
              null,
            interactiveTitle:
              message.interactive?.button_reply?.title ??
              message.interactive?.list_reply?.title ??
              null,
            timestamp: message.timestamp,
          },
        })
      }

      // Delivery statuses → whatsapp/status.update
      for (const status of value?.statuses ?? []) {
        events.push({
          id: `${status.id}:${status.status}`,
          name: 'whatsapp/status.update' as const,
          data: {
            messageId: status.id,
            recipientId: status.recipient_id,
            status: status.status,
            timestamp: status.timestamp,
          },
        })
      }
    }
  }

  return events
}
