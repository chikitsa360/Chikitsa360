import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * GET /api/v1/patients/search?q={query}&page=1&limit=20
 *
 * Search patients by name (ILIKE) or phone (exact or last-4-digits).
 * Tenant-isolated: enforces clinicId from session matches query scope.
 * Returns results within 1s for ≤ 5,000 records (FR-19, NFR-4).
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Tenant isolation: validate clinicId param matches session (if provided)
  const queryClinicId = req.nextUrl.searchParams.get('clinicId')
  if (queryClinicId && queryClinicId !== session.user.clinicId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const clinicId = session.user.clinicId
  const schemaName = `clinic_${clinicId}`

  const q = req.nextUrl.searchParams.get('q') ?? ''
  const page = parseInt(req.nextUrl.searchParams.get('page') ?? '1', 10)
  const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '20', 10)
  const safeLimit = Math.min(Math.max(limit, 1), 50)
  const offset = (Math.max(page, 1) - 1) * safeLimit

  if (q.length < 3) {
    return NextResponse.json({ patients: [], total: 0 })
  }

  const isAllDigits = /^\d+$/.test(q)
  const isFourDigits = isAllDigits && q.length <= 4
  const isTenDigits = isAllDigits && q.length === 10

  let whereClause: string
  let params: (string | number)[]

  if (isTenDigits) {
    // Exact phone match
    whereClause = `WHERE p.phone = $1`
    params = [q, safeLimit, offset]
  } else if (isFourDigits) {
    // Last-4-digit phone match
    whereClause = `WHERE p.phone LIKE $1`
    params = [`%${q}`, safeLimit, offset]
  } else {
    // Case-insensitive name partial match
    whereClause = `WHERE p.name ILIKE $1`
    params = [`%${q}%`, safeLimit, offset]
  }

  const countQuery = `
    SELECT COUNT(*)::text AS total
    FROM "${schemaName}".patients p
    ${whereClause}
  `
  const dataQuery = `
    SELECT
      p.id, p.name, p.phone, p.dob::text, p.gender,
      p.booking_source, p.created_at::text,
      MAX(a.appointment_date)::text AS last_visit_date,
      (SELECT d.name FROM "${schemaName}".doctors d
       JOIN "${schemaName}".appointments la ON la.doctor_id = d.id
       WHERE la.patient_id = p.id AND la.status = 'completed'
       ORDER BY la.appointment_date DESC LIMIT 1) AS last_doctor_name
    FROM "${schemaName}".patients p
    LEFT JOIN "${schemaName}".appointments a
      ON a.patient_id = p.id AND a.status != 'cancelled'
    ${whereClause}
    GROUP BY p.id
    ORDER BY p.name ASC
    LIMIT $2 OFFSET $3
  `

  const [countRows, patients] = await Promise.all([
    db.$queryRawUnsafe<{ total: string }[]>(countQuery, params[0]),
    db.$queryRawUnsafe<{
      id: string
      name: string
      phone: string
      dob: string | null
      gender: string | null
      booking_source: string
      created_at: string
      last_visit_date: string | null
      last_doctor_name: string | null
    }[]>(dataQuery, ...params),
  ])

  const total = parseInt(countRows[0]?.total ?? '0', 10)

  return NextResponse.json({ patients, total, query: q })
}
