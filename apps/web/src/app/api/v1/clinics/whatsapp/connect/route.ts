import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { registerWebhook } from '@/lib/meta-whatsapp'
import { z } from 'zod'

const connectSchema = z.object({
  wabaId: z.string().min(1),
  phoneNumberId: z.string().min(1),
  // Access token is passed from Meta Embedded Signup flow
  accessToken: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = connectSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 })
  }

  const { wabaId, phoneNumberId, accessToken } = parsed.data

  // Register webhook with Meta
  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? 'https://app.cliniqly.com'
  const webhookUrl = `${baseUrl}/api/webhooks/whatsapp`
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN ?? ''

  const webhookResult = await registerWebhook(phoneNumberId, webhookUrl, verifyToken, accessToken)
  if (!webhookResult.success) {
    return NextResponse.json(
      { error: webhookResult.error ?? 'Failed to register webhook with Meta' },
      { status: 502 }
    )
  }

  // Store credentials on Clinic record
  await db.clinic.update({
    where: { id: session.user.clinicId },
    data: {
      whatsappWabaId: wabaId,
      whatsappPhoneNumberId: phoneNumberId,
      whatsappConnected: true,
    },
  })

  return NextResponse.json({ connected: true })
}
