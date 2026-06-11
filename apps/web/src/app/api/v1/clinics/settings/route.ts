import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { writeAuditLog } from '@/lib/audit'

const settingsSchema = z.object({
  reminder_24h_enabled: z.boolean().optional(),
  reminder_2h_enabled: z.boolean().optional(),
  event_reminder_24h_enabled: z.boolean().optional(),
})

/**
 * GET /api/v1/clinics/settings
 * Returns current notification settings for the authenticated clinic (Owner only).
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const clinic = await db.clinic.findUnique({
    where: { id: session.user.clinicId },
    select: {
      reminder24hEnabled: true,
      reminder2hEnabled: true,
      eventReminder24hEnabled: true,
    },
  })

  if (!clinic) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Opt-out count from tenant schema
  const schemaName = `clinic_${session.user.clinicId}`
  let optOutCount = 0
  try {
    const rows = await db.$queryRawUnsafe<{ count: string }[]>(
      `SELECT COUNT(*)::text AS count FROM "${schemaName}".patients WHERE whatsapp_opt_out_at IS NOT NULL`
    )
    optOutCount = parseInt(rows[0]?.count ?? '0', 10)
  } catch { /* table may not exist in test env */ }

  return NextResponse.json({
    reminder_24h_enabled: clinic.reminder24hEnabled,
    reminder_2h_enabled: clinic.reminder2hEnabled,
    event_reminder_24h_enabled: clinic.eventReminder24hEnabled,
    opt_out_count: optOutCount,
  })
}

/**
 * PATCH /api/v1/clinics/settings
 * Updates notification settings. Owner only.
 */
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only OWNER can change notification settings
  if (session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = settingsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 })
  }

  const clinicId = session.user.clinicId
  const current = await db.clinic.findUnique({
    where: { id: clinicId },
    select: { reminder24hEnabled: true, reminder2hEnabled: true, eventReminder24hEnabled: true },
  })

  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const data: { reminder24hEnabled?: boolean; reminder2hEnabled?: boolean; eventReminder24hEnabled?: boolean } = {}
  if (parsed.data.reminder_24h_enabled !== undefined) {
    data.reminder24hEnabled = parsed.data.reminder_24h_enabled
  }
  if (parsed.data.reminder_2h_enabled !== undefined) {
    data.reminder2hEnabled = parsed.data.reminder_2h_enabled
  }
  if (parsed.data.event_reminder_24h_enabled !== undefined) {
    data.eventReminder24hEnabled = parsed.data.event_reminder_24h_enabled
  }

  const updated = await db.clinic.update({
    where: { id: clinicId },
    data,
    select: { reminder24hEnabled: true, reminder2hEnabled: true, eventReminder24hEnabled: true },
  })

  // Audit log
  try {
    const changes: Record<string, { old: boolean; new: boolean }> = {}
    if (parsed.data.reminder_24h_enabled !== undefined && parsed.data.reminder_24h_enabled !== current.reminder24hEnabled) {
      changes['reminder_24h_enabled'] = { old: current.reminder24hEnabled, new: parsed.data.reminder_24h_enabled }
    }
    if (parsed.data.reminder_2h_enabled !== undefined && parsed.data.reminder_2h_enabled !== current.reminder2hEnabled) {
      changes['reminder_2h_enabled'] = { old: current.reminder2hEnabled, new: parsed.data.reminder_2h_enabled }
    }
    for (const [field, { old: oldValue, new: newValue }] of Object.entries(changes)) {
      await writeAuditLog({
        clinicId,
        userId: session.user.id,
        action: 'SETTINGS_CHANGE',
        resourceType: 'clinic',
        resourceId: clinicId,
        metadata: { action: 'settings-change', field, oldValue, newValue, actorId: session.user.id },
      })
    }
  } catch { /* non-fatal */ }

  return NextResponse.json({
    reminder_24h_enabled: updated.reminder24hEnabled,
    reminder_2h_enabled: updated.reminder2hEnabled,
    event_reminder_24h_enabled: updated.eventReminder24hEnabled,
  })
}
