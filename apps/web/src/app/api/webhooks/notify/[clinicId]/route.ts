import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { inngest } from '@/lib/inngest'
import { decryptNotifySecret } from '@/lib/notify/crypto'
import {
  verifyNotifySignature,
  translateToInngestEvent,
  type NotifyWebhookBody,
} from '@/lib/notify/webhook'

/**
 * POST /api/webhooks/notify/[clinicId]
 *
 * Bridge for clinics on the 'notify' WhatsApp transport. The Notify platform
 * delivers reply/status events here (each clinic's tenant registers this URL
 * with its own signing secret). Payloads are translated into the exact same
 * Inngest events the direct Meta webhook emits — whatsapp/message.received and
 * whatsapp/status.update — so the conversation state machine, slot locking,
 * delivery tracking, and SMS fallback run unchanged.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clinicId: string }> }
) {
  const { clinicId } = await params
  const rawBody = await req.text()
  const signature = req.headers.get('x-notify-signature') ?? ''

  const clinic = await db.clinic.findUnique({
    where: { id: clinicId },
    select: {
      whatsappTransport: true,
      whatsappPhoneNumberId: true,
      notifyWebhookSecretEncrypted: true,
    },
  })

  if (!clinic || clinic.whatsappTransport !== 'notify' || !clinic.notifyWebhookSecretEncrypted) {
    return NextResponse.json({ error: 'Unknown endpoint' }, { status: 404 })
  }

  let secret: string
  try {
    secret = decryptNotifySecret(clinic.notifyWebhookSecretEncrypted)
  } catch {
    console.error(
      JSON.stringify({
        action: 'NOTIFY_WEBHOOK_SECRET_UNDECRYPTABLE',
        resource_type: 'notify_webhook',
        clinic_id: clinicId,
        timestamp: new Date().toISOString(),
      })
    )
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
  }

  if (!verifyNotifySignature(rawBody, signature, secret)) {
    console.error(
      JSON.stringify({
        action: 'WEBHOOK_SIGNATURE_INVALID',
        resource_type: 'notify_webhook',
        clinic_id: clinicId,
        timestamp: new Date().toISOString(),
      })
    )
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
  }

  // Past this point always return 200 — Notify auto-disables an endpoint after
  // 10 consecutive delivery failures, so a transient parse/Inngest error must
  // not look like an endpoint failure. (Same rationale as the Meta webhook's
  // unconditional 200.)
  try {
    const body = JSON.parse(rawBody) as NotifyWebhookBody
    const eventName = body.event ?? req.headers.get('x-notify-event') ?? ''
    const ev = translateToInngestEvent(eventName, body.data, clinic.whatsappPhoneNumberId ?? '')
    if (ev) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await inngest.send(ev as any)
    }
  } catch {
    // JSON parse or Inngest error — still 200, Inngest-side dedup makes retries safe
  }

  return NextResponse.json({ ok: true })
}
