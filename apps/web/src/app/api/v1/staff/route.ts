import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { requirePermission, isRbacError, getDoctorLimit } from '@/lib/rbac'
import { revokeAllSessions } from '@/lib/session-store'
import { writeAuditLog } from '@/lib/audit'
import { inviteStaffSchema } from '@chikitsa360/core'
import { apiSuccess, apiError, HTTP } from '@/app/api/v1/_lib/response'
import { UserRole } from '@prisma/client'
import crypto from 'crypto'

async function getSession() {
  const session = await auth()
  if (!session?.user?.clinicId) return null
  return session.user as { id: string; clinicId: string; role: UserRole }
}

// GET /api/v1/staff — list staff members
export async function GET() {
  const session = await getSession()
  if (!session) return apiError('UNAUTHORIZED', 'Authentication required', HTTP.UNAUTHORIZED)

  try {
    requirePermission(
      { userId: session.id, clinicId: session.clinicId, role: session.role as UserRole },
      'staff:read'
    )
  } catch (err) {
    if (isRbacError(err)) return apiError('FORBIDDEN', (err as Error).message, HTTP.FORBIDDEN)
    throw err
  }

  const users = await db.user.findMany({
    where: { clinicId: session.clinicId },
    select: { id: true, name: true, phone: true, role: true, createdAt: true },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  })

  const invites = await db.staffInvite.findMany({
    where: { clinicId: session.clinicId, status: 'PENDING' },
    select: { id: true, phone: true, role: true, createdAt: true, expiresAt: true },
  })

  return apiSuccess({ staff: users, pendingInvites: invites })
}

// POST /api/v1/staff — invite a staff member
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return apiError('UNAUTHORIZED', 'Authentication required', HTTP.UNAUTHORIZED)

  try {
    requirePermission(
      { userId: session.id, clinicId: session.clinicId, role: session.role as UserRole },
      'staff:invite'
    )
  } catch (err) {
    if (isRbacError(err)) return apiError('FORBIDDEN', (err as Error).message, HTTP.FORBIDDEN)
    throw err
  }

  const body = await req.json().catch(() => null)
  const parsed = inviteStaffSchema.safeParse(body)
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid input', HTTP.BAD_REQUEST, parsed.error.issues)
  }

  const { phone, role } = parsed.data

  // Enforce Doctor limit per plan
  if (role === 'DOCTOR') {
    const clinic = await db.clinic.findUnique({
      where: { id: session.clinicId },
      select: { plan: true },
    })
    const doctorCount = await db.user.count({
      where: { clinicId: session.clinicId, role: 'DOCTOR' },
    })
    const pendingDoctors = await db.staffInvite.count({
      where: { clinicId: session.clinicId, role: 'DOCTOR', status: 'PENDING' },
    })
    const limit = getDoctorLimit(clinic?.plan ?? 'STARTER')
    if (doctorCount + pendingDoctors >= limit) {
      return apiError(
        'PLAN_LIMIT',
        `You've reached your Doctor limit on the ${clinic?.plan ?? 'STARTER'} plan.`,
        HTTP.BAD_REQUEST
      )
    }
  }

  // Check for existing user with this phone
  const existing = await db.user.findFirst({ where: { phone, clinicId: session.clinicId } })
  if (existing) {
    return apiError('ALREADY_EXISTS', 'A staff member with this phone is already in your clinic', HTTP.BAD_REQUEST)
  }

  // Create invite
  const token = crypto.randomBytes(32).toString('hex')
  const invite = await db.staffInvite.create({
    data: {
      clinicId: session.clinicId,
      phone,
      role: role as UserRole,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  })

  await writeAuditLog({
    clinicId: session.clinicId,
    userId: session.id,
    action: 'INVITE_STAFF',
    resourceType: 'staff_invite',
    resourceId: invite.id,
    metadata: { phone, role },
  })

  return apiSuccess({ inviteId: invite.id, token }, HTTP.CREATED)
}

// DELETE /api/v1/staff?userId=<id> — remove a staff member
export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session) return apiError('UNAUTHORIZED', 'Authentication required', HTTP.UNAUTHORIZED)

  try {
    requirePermission(
      { userId: session.id, clinicId: session.clinicId, role: session.role as UserRole },
      'staff:remove'
    )
  } catch (err) {
    if (isRbacError(err)) return apiError('FORBIDDEN', (err as Error).message, HTTP.FORBIDDEN)
    throw err
  }

  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return apiError('MISSING_PARAM', 'userId is required', HTTP.BAD_REQUEST)

  // Verify the user belongs to this clinic
  const user = await db.user.findFirst({
    where: { id: userId, clinicId: session.clinicId },
  })
  if (!user) return apiError('NOT_FOUND', 'Staff member not found', HTTP.NOT_FOUND)

  // Prevent removing yourself
  if (userId === session.id) {
    return apiError('CANNOT_REMOVE_SELF', 'You cannot remove yourself', HTTP.BAD_REQUEST)
  }

  // Revoke all sessions for the removed user
  await revokeAllSessions(userId)

  // Soft-delete: disconnect from clinic (preserves audit/appointment history)
  await db.user.update({
    where: { id: userId },
    data: { clinicId: null },
  })

  await writeAuditLog({
    clinicId: session.clinicId,
    userId: session.id,
    action: 'REMOVE_STAFF',
    resourceType: 'user',
    resourceId: userId,
  })

  return apiSuccess({ removed: true })
}
