import { NextRequest, NextResponse } from 'next/server'

import { z } from 'zod'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { encryptNotifySecret } from '@/lib/notify/crypto'
import {
  createTenant,
  issueApiKey,
  registerWebhookEndpoint,
  saveManualCredentials,
  completeEmbeddedSignup,
} from '@/lib/notify/partner'
import { clearTransportCache } from '@/lib/notify/transport'

/**
 * POST /api/v1/clinics/whatsapp/connect-notify
 *
 * Connects a clinic's WhatsApp via the Notify platform (transport 'notify').
 * The legacy direct-Meta flow at /clinics/whatsapp/connect is untouched —
 * both paths coexist; this one provisions a Notify tenant instead.
 *
 * Two methods, same destination:
 *  - embedded_signup: OAuth code from Meta's popup (clinic has no WhatsApp setup)
 *  - manual: clinic brings its own Meta credentials (BYO)
 *
 * Steps are persisted as they succeed (tenantId, API key, webhook secret), so
 * a failed call is safely retryable and resumes where it left off.
 */

const connectNotifySchema = z.discriminatedUnion('method', [
  z.object({
    method: z.literal('embedded_signup'),
    code: z.string().min(1),
    wabaId: z.string().min(1),
    phoneNumberId: z.string().min(1),
  }),
  z.object({
    method: z.literal('manual'),
    accessToken: z.string().min(1),
    phoneNumberId: z.string().min(1),
    wabaId: z.string().optional(),
    appSecret: z.string().optional(),
  }),
])

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const clinicId = session.user.clinicId

  const body = await req.json()
  const parsed = connectNotifySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 400 }
    )
  }

  const clinic = await db.clinic.findUnique({
    where: { id: clinicId },
    select: {
      name: true,
      notifyTenantId: true,
      notifyApiKeyEncrypted: true,
      notifyWebhookSecretEncrypted: true,
    },
  })
  if (!clinic) {
    return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })
  }

  // 1. Notify tenant (auto-reply off — Cliniqly's state machine is the only responder)
  let tenantId = clinic.notifyTenantId
  if (!tenantId) {
    const created = await createTenant({
      name: clinic.name,
      category: 'healthcare',
      autoReplyEnabled: false,
    })
    if (!created.ok || !created.data?.tenantId) {
      return NextResponse.json(
        { error: created.error ?? 'Failed to create Notify tenant' },
        { status: 502 }
      )
    }
    tenantId = created.data.tenantId
    await db.clinic.update({ where: { id: clinicId }, data: { notifyTenantId: tenantId } })
  }

  // 2. Tenant API key (skip if already issued — reissuing would orphan the stored one)
  if (!clinic.notifyApiKeyEncrypted) {
    const keyRes = await issueApiKey(tenantId, 'cliniqly')
    if (!keyRes.ok || !keyRes.data?.apiKey) {
      return NextResponse.json(
        { error: keyRes.error ?? 'Failed to issue Notify API key' },
        { status: 502 }
      )
    }
    await db.clinic.update({
      where: { id: clinicId },
      data: { notifyApiKeyEncrypted: encryptNotifySecret(keyRes.data.apiKey) },
    })
  }

  // 3. Webhook endpoint back to this app (skip if already registered)
  if (!clinic.notifyWebhookSecretEncrypted) {
    const baseUrl = process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? 'https://app.cliniqly.com'
    const webhookRes = await registerWebhookEndpoint(
      tenantId,
      `${baseUrl}/api/webhooks/notify/${clinicId}`
    )
    if (!webhookRes.ok || !webhookRes.data?.secret) {
      return NextResponse.json(
        { error: webhookRes.error ?? 'Failed to register Notify webhook' },
        { status: 502 }
      )
    }
    await db.clinic.update({
      where: { id: clinicId },
      data: { notifyWebhookSecretEncrypted: encryptNotifySecret(webhookRes.data.secret) },
    })
  }

  // 4. WhatsApp credentials — managed (embedded signup) or BYO (manual)
  const input = parsed.data
  const credsRes =
    input.method === 'embedded_signup'
      ? await completeEmbeddedSignup(tenantId, {
          code: input.code,
          wabaId: input.wabaId,
          phoneNumberId: input.phoneNumberId,
        })
      : await saveManualCredentials(tenantId, {
          accessToken: input.accessToken,
          phoneNumberId: input.phoneNumberId,
          wabaId: input.wabaId,
          appSecret: input.appSecret,
        })
  if (!credsRes.ok) {
    return NextResponse.json(
      { error: credsRes.error ?? 'Failed to connect WhatsApp via Notify' },
      { status: 502 }
    )
  }

  // 5. Flip the clinic to the notify transport
  await db.clinic.update({
    where: { id: clinicId },
    data: {
      whatsappWabaId: input.wabaId ?? null,
      whatsappPhoneNumberId: input.phoneNumberId,
      whatsappConnected: true,
      whatsappTransport: 'notify',
    },
  })
  clearTransportCache()

  return NextResponse.json({ connected: true, transport: 'notify', method: input.method })
}
