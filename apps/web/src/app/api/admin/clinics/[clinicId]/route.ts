import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { writeAuditLog } from '@/lib/audit'
import { ClinicPlan } from '@prisma/client'

const patchSchema = z.object({
  plan: z.string().optional(),
  planExpiresAt: z.string().datetime().optional().nullable(),
  doctorLimit: z.number().int().min(1).max(50).optional(),
})

/**
 * PATCH /api/admin/clinics/[clinicId]
 * Super-admin only. Update clinic plan, expiry, and doctor limit (MON-1).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ clinicId: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.systemRole !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { clinicId } = await params

  const existing = await db.clinic.findUnique({
    where: { id: clinicId },
    select: { id: true, name: true, plan: true, planExpiresAt: true, doctorLimit: true },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', issues: parsed.error.issues }, { status: 400 })
  }

  const { plan, planExpiresAt, doctorLimit } = parsed.data

  const updated = await db.clinic.update({
    where: { id: clinicId },
    data: {
      ...(plan !== undefined && { plan: plan as ClinicPlan }),
      ...(planExpiresAt !== undefined && {
        planExpiresAt: planExpiresAt ? new Date(planExpiresAt) : null,
      }),
      ...(doctorLimit !== undefined && { doctorLimit }),
    },
    select: { id: true, name: true, plan: true, planExpiresAt: true, doctorLimit: true },
  })

  // Audit log — note: super-admin userId used as clinicId (no clinic affiliation)
  await writeAuditLog({
    clinicId,
    userId: session.user.id,
    action: 'SETTINGS_CHANGE',
    resourceType: 'clinic',
    resourceId: clinicId,
    metadata: {
      action: 'admin-plan-change',
      oldPlan: existing.plan,
      newPlan: plan ?? existing.plan,
      oldExpiry: existing.planExpiresAt?.toISOString() ?? null,
      newExpiry: planExpiresAt ?? existing.planExpiresAt?.toISOString() ?? null,
      actorId: session.user.id,
    },
  })

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    plan: updated.plan,
    planExpiresAt: updated.planExpiresAt?.toISOString() ?? null,
    doctorLimit: updated.doctorLimit,
  })
}
