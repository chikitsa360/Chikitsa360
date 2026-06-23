import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
})

// POST /api/v1/push/subscribe — save push subscription for the current user
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || !session.user.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = subscribeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
  }

  const { endpoint, keys } = parsed.data

  // Upsert — same endpoint might re-subscribe after a key rotation
  await db.pushSubscription.upsert({
    where: { endpoint },
    create: {
      userId: session.user.id,
      clinicId: session.user.clinicId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
    update: {
      userId: session.user.id,
      clinicId: session.user.clinicId,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
  })

  return NextResponse.json({ ok: true })
}

// DELETE /api/v1/push/subscribe — remove subscription on logout/unsubscribe
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const endpoint = searchParams.get('endpoint')
  if (!endpoint) {
    return NextResponse.json({ error: 'endpoint required' }, { status: 400 })
  }

  await db.pushSubscription.deleteMany({
    where: { endpoint, userId: session.user.id },
  }).catch(() => {}) // non-fatal if already gone

  return NextResponse.json({ ok: true })
}
