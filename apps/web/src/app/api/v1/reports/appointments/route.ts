import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * GET /api/v1/reports/appointments?from=YYYY-MM-DD&to=YYYY-MM-DD&doctorId=optional
 * Owner-only. Returns appointment summary + per-doctor breakdown.
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

  // Summary aggregates
  const [summary] = await db.$queryRawUnsafe<{
    total: string
    completed: string
    cancelled: string
    no_shows: string
  }[]>(
    `SELECT
       COUNT(*) FILTER (WHERE is_sample = false)                            AS total,
       COUNT(*) FILTER (WHERE status = 'completed'  AND is_sample = false)  AS completed,
       COUNT(*) FILTER (WHERE status = 'cancelled'  AND is_sample = false)  AS cancelled,
       COUNT(*) FILTER (WHERE status = 'no-show'    AND is_sample = false)  AS no_shows
     FROM "${schema}".appointments a
     WHERE a.appointment_date >= $1::date
       AND a.appointment_date <= $2::date
       AND a.is_sample = false
       ${doctorFilter}`,
    ...params
  )

  const total = parseInt(summary?.total ?? '0')
  const completed = parseInt(summary?.completed ?? '0')
  const cancelled = parseInt(summary?.cancelled ?? '0')
  const noShows = parseInt(summary?.no_shows ?? '0')
  const completedPct = total > 0 ? ((completed / total) * 100).toFixed(1) : '0'
  const cancelledPct = total > 0 ? ((cancelled / total) * 100).toFixed(1) : '0'
  const noShowPct = total > 0 ? ((noShows / total) * 100).toFixed(1) : '0'

  // Per-doctor breakdown (only when no doctor filter active)
  let byDoctor: {
    doctorId: string
    doctorName: string
    total: number
    completed: number
    cancelled: number
    noShows: number
    noShowPct: string
  }[] = []

  if (!doctorId) {
    const rows = await db.$queryRawUnsafe<{
      doctor_id: string
      doctor_name: string
      total: string
      completed: string
      cancelled: string
      no_shows: string
    }[]>(
      `SELECT
         a.doctor_id,
         d.name AS doctor_name,
         COUNT(*)                                          AS total,
         COUNT(*) FILTER (WHERE a.status = 'completed')   AS completed,
         COUNT(*) FILTER (WHERE a.status = 'cancelled')   AS cancelled,
         COUNT(*) FILTER (WHERE a.status = 'no-show')     AS no_shows
       FROM "${schema}".appointments a
       JOIN "${schema}".doctors d ON d.id = a.doctor_id
       WHERE a.appointment_date >= $1::date
         AND a.appointment_date <= $2::date
         AND a.is_sample = false
       GROUP BY a.doctor_id, d.name
       ORDER BY COUNT(*) DESC`,
      from, to
    )

    byDoctor = rows.map((r) => {
      const t = parseInt(r.total)
      const ns = parseInt(r.no_shows)
      return {
        doctorId: r.doctor_id,
        doctorName: r.doctor_name,
        total: t,
        completed: parseInt(r.completed),
        cancelled: parseInt(r.cancelled),
        noShows: ns,
        noShowPct: t > 0 ? ((ns / t) * 100).toFixed(1) : '0',
      }
    })
  }

  return NextResponse.json({
    summary: { total, completed, cancelled, noShows, completedPct, cancelledPct, noShowPct },
    byDoctor,
  })
}
