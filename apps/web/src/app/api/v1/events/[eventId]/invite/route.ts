import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { inngest } from '@/lib/inngest'
import { z } from 'zod'

const inviteSchema = z.object({
  patientIds: z.array(z.string().uuid()).min(1).max(500),
})

// ─── POST /api/v1/events/[eventId]/invite ─────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { clinicId } = session.user
  const { eventId } = await params
  const schemaName = `clinic_${clinicId}`

  // Verify event belongs to this clinic
  const eventRows = await db.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM "${schemaName}".events WHERE id = $1::uuid AND clinic_id = $2 LIMIT 1`,
    eventId,
    clinicId
  )
  if (!eventRows[0]) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: { code: 'INVALID_JSON' } }, { status: 400 })
  }

  const parsed = inviteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'patientIds must not be empty' } },
      { status: 400 }
    )
  }

  const { patientIds } = parsed.data

  // Upsert invitation records — ON CONFLICT DO NOTHING skips duplicates
  const insertedRows = await db.$queryRawUnsafe<{ id: string }[]>(
    `INSERT INTO "${schemaName}".event_invitations (event_id, patient_id, delivery_status, created_at)
     SELECT $1, unnest($2::uuid[]), 'pending', NOW()
     ON CONFLICT (event_id, patient_id) DO NOTHING
     RETURNING id`,
    eventId,
    patientIds
  )

  const invited = (insertedRows as { id: string }[]).length
  const alreadyInvited = patientIds.length - invited

  // Fire async Inngest job for WhatsApp blast
  await inngest.send({
    name: 'event/invitation.blast' as never,
    data: { eventId, clinicId, patientIds },
    id: `${eventId}:invite:${Date.now()}`,
  })

  return NextResponse.json(
    { data: { invited, alreadyInvited } },
    { status: 202 }
  )
}
