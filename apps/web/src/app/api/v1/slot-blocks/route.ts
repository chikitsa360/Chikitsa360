import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { pusherServer, clinicChannel } from '@/lib/pusher'
import { writeAuditLog } from '@/lib/audit'

/**
 * GET /api/v1/slot-blocks?startDate=&endDate=&doctorId=
 * Authenticated. Returns slot blocks for a date range.
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const clinicId = session.user.clinicId
  const schemaName = `clinic_${clinicId}`
  const startDate = req.nextUrl.searchParams.get('startDate')
  const endDate = req.nextUrl.searchParams.get('endDate')
  const doctorId = req.nextUrl.searchParams.get('doctorId')

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'startDate and endDate required' }, { status: 400 })
  }

  let query = `
    SELECT id, doctor_id, block_date::text, start_time::text, end_time::text,
           reason, recurrence, created_by, created_at::text
    FROM "${schemaName}".slot_blocks
    WHERE (
      recurrence = 'none' AND block_date >= $1::date AND block_date <= $2::date
      OR recurrence = 'daily'
      OR recurrence = 'weekly'
    )`

  const args: unknown[] = [startDate, endDate]

  if (doctorId) {
    query += ` AND (doctor_id = $3::uuid OR doctor_id IS NULL)`
    args.push(doctorId)
  }

  query += ' ORDER BY block_date, start_time'

  const rows = await db.$queryRawUnsafe<{
    id: string
    doctor_id: string | null
    block_date: string
    start_time: string
    end_time: string
    reason: string | null
    recurrence: string
    created_by: string | null
    created_at: string
  }[]>(query, ...args)

  return NextResponse.json({ blocks: rows })
}

// ─── POST /api/v1/slot-blocks ─────────────────────────────────────────────────

const createBlockSchema = z.object({
  doctorId: z.string().uuid().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  reason: z.string().max(200).optional(),
  recurrence: z.enum(['none', 'daily', 'weekly']).default('none'),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const clinicId = session.user.clinicId
  const userId = session.user.id
  const schemaName = `clinic_${clinicId}`

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = createBlockSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 400 }
    )
  }

  const { doctorId, date, startTime, endTime, reason, recurrence } = parsed.data

  if (endTime <= startTime) {
    return NextResponse.json({ error: 'endTime must be after startTime' }, { status: 400 })
  }

  const blockRows = await db.$queryRawUnsafe<{ id: string }[]>(
    `INSERT INTO "${schemaName}".slot_blocks
       (doctor_id, block_date, start_time, end_time, reason, recurrence, created_by)
     VALUES ($1, $2::date, $3::time, $4::time, $5, $6, $7::uuid)
     RETURNING id`,
    doctorId ?? null,
    date,
    startTime,
    endTime,
    reason ?? null,
    recurrence,
    userId
  )

  const block = blockRows[0]
  if (!block) {
    return NextResponse.json({ error: 'Failed to create block' }, { status: 500 })
  }

  // Tenant audit log
  try {
    await db.$executeRawUnsafe(
      `INSERT INTO "${schemaName}".audit_log
         (action, actor_id, actor_role, resource_type, resource_id, metadata)
       VALUES ('slot-block', $1::uuid, $2, 'slot_block', $3::uuid, $4::jsonb)`,
      userId,
      session.user.role,
      block.id,
      JSON.stringify({ doctorId, date, startTime, endTime, recurrence, reason })
    )
  } catch { /* non-fatal */ }

  // Audit log
  try {
    await writeAuditLog({
      clinicId,
      userId,
      action: 'MODIFY_APPOINTMENT',
      resourceType: 'slot_block',
      resourceId: block.id,
      metadata: { action: 'slot-block', doctorId, date, startTime, endTime, recurrence },
    })
  } catch { /* non-fatal */ }

  // Pusher event — open booking sessions see slots disappear
  try {
    await pusherServer.trigger(clinicChannel(clinicId), 'slot.blocked', {
      blockId: block.id,
      clinicId,
      doctorId,
      date,
      startTime,
      endTime,
    })
  } catch { /* non-fatal */ }

  return NextResponse.json({ blockId: block.id }, { status: 201 })
}
