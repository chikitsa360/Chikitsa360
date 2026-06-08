import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * GET /api/v1/reports/noshow-trend
 * Owner-only. Returns trailing 7 IST calendar days of no-show counts.
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const schema = `clinic_${session.user.clinicId}`

  const rows = await db.$queryRawUnsafe<{ day: string; count: string }[]>(`
    WITH days AS (
      SELECT generate_series(
        ((NOW() AT TIME ZONE 'Asia/Kolkata')::date - 6),
        (NOW() AT TIME ZONE 'Asia/Kolkata')::date,
        '1 day'::interval
      )::date AS day
    )
    SELECT
      d.day::text,
      COALESCE(COUNT(a.id), 0)::text AS count
    FROM days d
    LEFT JOIN "${schema}".appointments a
      ON a.appointment_date = d.day
     AND a.status = 'no-show'
     AND a.is_sample = false
    GROUP BY d.day
    ORDER BY d.day ASC
  `)

  return NextResponse.json({
    trend: rows.map((r) => ({
      day: r.day,
      count: parseInt(r.count),
    })),
  })
}
