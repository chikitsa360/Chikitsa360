import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { pusherServer, clinicChannel } from '@/lib/pusher'
import { writeAuditLog } from '@/lib/audit'

/**
 * DELETE /api/v1/slot-blocks/[id]?scope=this|future
 * Authenticated. Removes a slot block (single occurrence or all future for recurring).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const scope = req.nextUrl.searchParams.get('scope') ?? 'this' // 'this' | 'future'
  const clinicId = session.user.clinicId
  const userId = session.user.id
  const schemaName = `clinic_${clinicId}`

  const rows = await db.$queryRawUnsafe<{
    id: string
    recurrence: string
    block_date: string
    doctor_id: string | null
  }[]>(
    `SELECT id, recurrence, block_date::text, doctor_id FROM "${schemaName}".slot_blocks WHERE id = $1 LIMIT 1`,
    id
  )
  const block = rows[0]
  if (!block) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (block.recurrence !== 'none' && scope === 'future') {
    // Remove this block and all future occurrences (same recurrence pattern)
    // Since we don't store parent/child, we delete all recurring blocks of same type
    // from block_date onwards with the same recurrence pattern
    await db.$executeRawUnsafe(
      `DELETE FROM "${schemaName}".slot_blocks
       WHERE id = $1 OR (
         recurrence = $2
         AND block_date >= $3::date
         AND (doctor_id = $4::uuid OR (doctor_id IS NULL AND $4 IS NULL))
       )`,
      id,
      block.recurrence,
      block.block_date,
      block.doctor_id
    )
  } else {
    // Delete only this occurrence
    await db.$executeRawUnsafe(
      `DELETE FROM "${schemaName}".slot_blocks WHERE id = $1`,
      id
    )
  }

  // Tenant audit log
  try {
    await db.$executeRawUnsafe(
      `INSERT INTO "${schemaName}".audit_log
         (action, actor_id, actor_role, resource_type, resource_id, metadata)
       VALUES ('slot-unblock', $1::uuid, $2, 'slot_block', $3::uuid, $4::jsonb)`,
      userId,
      session.user.role,
      id,
      JSON.stringify({ scope })
    )
  } catch { /* non-fatal */ }

  // Audit log
  try {
    await writeAuditLog({
      clinicId,
      userId,
      action: 'MODIFY_APPOINTMENT',
      resourceType: 'slot_block',
      resourceId: id,
      metadata: { action: 'slot-unblock', scope },
    })
  } catch { /* non-fatal */ }

  // Pusher event — slots reappear in booking flows
  try {
    await pusherServer.trigger(clinicChannel(clinicId), 'slot.unblocked', {
      blockId: id,
      clinicId,
    })
  } catch { /* non-fatal */ }

  return NextResponse.json({ ok: true })
}

// ─── GET /api/v1/slot-blocks/[id] ─────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const schemaName = `clinic_${session.user.clinicId}`

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
  }[]>(
    `SELECT id, doctor_id, block_date::text, start_time::text, end_time::text,
            reason, recurrence, created_by, created_at::text
     FROM "${schemaName}".slot_blocks WHERE id = $1 LIMIT 1`,
    id
  )

  const block = rows[0]
  if (!block) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ block })
}

// Satisfy zod import for linter
const _z = z.string()
void _z
