import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// ─── GET /api/v1/events/[eventId]/registrants ─────────────────────────────────

export async function GET(
  _req: NextRequest,
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
    `SELECT id FROM "${schemaName}".events WHERE id = $1 AND clinic_id = $2 LIMIT 1`,
    eventId,
    clinicId
  )
  if (!eventRows[0]) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Fetch registrations with patient info
  const registrations = await db.$queryRawUnsafe(
    `SELECT er.id, er.reference_number, er.status, er.registered_at AT TIME ZONE 'UTC' AS registered_at,
            p.name, p.phone
     FROM "${schemaName}".event_registrations er
     JOIN "${schemaName}".patients p ON p.id = er.patient_id
     WHERE er.event_id = $1
     ORDER BY er.registered_at ASC`,
    eventId
  )

  // Fetch waiting list with patient info
  const waitingList = await db.$queryRawUnsafe(
    `SELECT ewl.id, ewl.position, ewl.status, ewl.joined_at AT TIME ZONE 'UTC' AS joined_at,
            p.name, p.phone
     FROM "${schemaName}".event_waiting_list ewl
     JOIN "${schemaName}".patients p ON p.id = ewl.patient_id
     WHERE ewl.event_id = $1
     ORDER BY ewl.position ASC`,
    eventId
  )

  // Fetch invitations with patient info
  const invitations = await db.$queryRawUnsafe(
    `SELECT ei.id, ei.delivery_status, ei.sent_at AT TIME ZONE 'UTC' AS sent_at, ei.created_at AT TIME ZONE 'UTC' AS created_at,
            p.name, p.phone
     FROM "${schemaName}".event_invitations ei
     JOIN "${schemaName}".patients p ON p.id = ei.patient_id
     WHERE ei.event_id = $1
     ORDER BY ei.created_at ASC`,
    eventId
  )

  return NextResponse.json({
    data: { registrations, waitingList, invitations },
  })
}
