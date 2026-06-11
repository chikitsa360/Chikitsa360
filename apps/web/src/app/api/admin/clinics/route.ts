import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * GET /api/admin/clinics?q=&page=&sort=name|expiry
 * Super-admin only. Returns paginated list of all clinics with plan status.
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.systemRole !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const q = req.nextUrl.searchParams.get('q') ?? ''
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') ?? '1', 10))
  const limit = 25
  const offset = (page - 1) * limit

  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: 'insensitive' as const } },
          { users: { some: { phone: { contains: q } } } },
        ],
      }
    : {}

  const [clinics, total] = await Promise.all([
    db.clinic.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        planExpiresAt: true,
        doctorLimit: true,
        createdAt: true,
        users: {
          where: { role: 'OWNER' },
          select: { id: true, name: true, phone: true },
          take: 1,
        },
        _count: { select: { users: { where: { role: 'DOCTOR' } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    db.clinic.count({ where }),
  ])

  const now = new Date()
  const WARN_MS = 7 * 24 * 60 * 60 * 1000

  const rows = clinics.map((c) => {
    let planStatus: 'active' | 'expiring_soon' | 'expired' = 'active'
    if (c.planExpiresAt) {
      const ms = c.planExpiresAt.getTime() - now.getTime()
      if (ms <= 0) planStatus = 'expired'
      else if (ms <= WARN_MS) planStatus = 'expiring_soon'
    }

    const owner = c.users[0]
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      plan: c.plan,
      planExpiresAt: c.planExpiresAt?.toISOString() ?? null,
      doctorLimit: c.doctorLimit,
      doctorCount: c._count.users,
      planStatus,
      ownerName: owner?.name ?? null,
      ownerPhone: owner?.phone ?? null,
      createdAt: c.createdAt.toISOString(),
    }
  })

  return NextResponse.json({ clinics: rows, total, page, limit })
}
