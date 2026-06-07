import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { apiSuccess, apiError, HTTP } from '@/app/api/v1/_lib/response'

// GET /api/v1/invites/[token] — look up an invite by token
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const invite = await db.staffInvite.findUnique({
    where: { token },
    include: { clinic: { select: { name: true, slug: true } } },
  })

  if (!invite) {
    return apiError('NOT_FOUND', 'Invite not found', HTTP.NOT_FOUND)
  }

  if (invite.status === 'EXPIRED' || invite.expiresAt < new Date()) {
    // Mark as expired if not already
    if (invite.status === 'PENDING') {
      await db.staffInvite.update({ where: { token }, data: { status: 'EXPIRED' } })
    }
    return apiError('INVITE_EXPIRED', 'This invitation has expired', HTTP.BAD_REQUEST)
  }

  if (invite.status === 'ACCEPTED') {
    return apiError('INVITE_USED', 'This invitation has already been used', HTTP.BAD_REQUEST)
  }

  return apiSuccess({
    clinicName: invite.clinic.name,
    clinicSlug: invite.clinic.slug,
    role: invite.role,
    phone: invite.phone,
  })
}

// POST /api/v1/invites/[token] — accept an invite (called after OTP login)
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const invite = await db.staffInvite.findUnique({
    where: { token },
  })

  if (!invite || invite.status !== 'PENDING' || invite.expiresAt < new Date()) {
    return apiError('INVITE_INVALID', 'Invalid or expired invitation', HTTP.BAD_REQUEST)
  }

  // Create or update user and link to clinic
  const user = await db.user.upsert({
    where: { phone: invite.phone },
    update: { clinicId: invite.clinicId, role: invite.role },
    create: {
      phone: invite.phone,
      role: invite.role,
      clinicId: invite.clinicId,
    },
  })

  // Mark invite as accepted
  await db.staffInvite.update({
    where: { token },
    data: { status: 'ACCEPTED' },
  })

  return apiSuccess({ userId: user.id, role: user.role })
}
