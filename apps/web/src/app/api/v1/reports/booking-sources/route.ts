export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * GET /api/v1/reports/booking-sources?from=YYYY-MM-DD&to=YYYY-MM-DD&doctorId=optional
 * Owner-only. Returns appointment counts grouped by booking_source.
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const doctorId = searchParams.get('doctorId') ?? null

  if (!from || !to) {
    return NextResponse.json({ error: 'from and to date parameters are required' }, { status: 400 })
  }

  const schema = `clinic_${session.user.clinicId}`
  const doctorFilter = doctorId ? `AND a.doctor_id = $3::uuid` : ''
  const params = doctorId ? [from, to, doctorId] : [from, to]

  const rows = await db.$queryRawUnsafe<{ source: string; count: string }[]>(
    `SELECT
       COALESCE(a.booking_source, 'manual') AS source,
       COUNT(*)::text AS count
     FROM "${schema}".appointments a
     WHERE a.appointment_date >= $1::date
       AND a.appointment_date <= $2::date
       AND a.is_sample = false
       ${doctorFilter}
     GROUP BY a.booking_source
     ORDER BY COUNT(*) DESC`,
    ...params
  )

  const total = rows.reduce((acc, r) => acc + parseInt(r.count), 0)

  return NextResponse.json({
    sources: rows.map((r) => ({
      source: r.source,
      count: parseInt(r.count),
      pct: total > 0 ? ((parseInt(r.count) / total) * 100).toFixed(1) : '0',
    })),
    total,
  })
}
