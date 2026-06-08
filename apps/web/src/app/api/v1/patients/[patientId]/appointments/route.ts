import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * GET /api/v1/patients/[patientId]/appointments?page=1&limit=10
 *
 * Returns reverse-chronological visit history for a patient.
 * Tenant-isolated: 404 if patient doesn't belong to this clinic.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { patientId } = await params
  const clinicId = session.user.clinicId
  const schemaName = `clinic_${clinicId}`

  const page = parseInt(req.nextUrl.searchParams.get('page') ?? '1', 10)
  const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '10', 10)
  const safeLimit = Math.min(Math.max(limit, 1), 50)
  const offset = (Math.max(page, 1) - 1) * safeLimit

  // Verify patient belongs to this tenant (returns 404, not 403, for cross-tenant)
  const patientCheck = await db.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM "${schemaName}".patients WHERE id = $1::uuid LIMIT 1`,
    patientId
  )
  if (!patientCheck[0]) {
    return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
  }

  const [countRows, appointments] = await Promise.all([
    db.$queryRawUnsafe<{ total: string }[]>(
      `SELECT COUNT(*)::text AS total
       FROM "${schemaName}".appointments
       WHERE patient_id = $1::uuid`,
      patientId
    ),
    db.$queryRawUnsafe<{
      id: string
      appointment_date: string
      appointment_time: string | null
      doctor_name: string
      status: string
      token_number: number | null
      booking_source: string
      note_id: string | null
      note_text: string | null
      consultation_fee: string | null
      payment_status: string
    }[]>(
      `SELECT
         a.id,
         a.appointment_date::text,
         a.appointment_time::text,
         d.name AS doctor_name,
         a.status,
         a.token_number,
         a.booking_source,
         vn.id AS note_id,
         vn.note AS note_text,
         a.consultation_fee,
         COALESCE(a.payment_status, 'unpaid') AS payment_status
       FROM "${schemaName}".appointments a
       JOIN "${schemaName}".doctors d ON d.id = a.doctor_id
       LEFT JOIN "${schemaName}".visit_notes vn ON vn.appointment_id = a.id
       WHERE a.patient_id = $1::uuid
       ORDER BY a.appointment_date DESC, a.appointment_time DESC NULLS LAST
       LIMIT $2 OFFSET $3`,
      patientId,
      safeLimit,
      offset
    ),
  ])

  const total = parseInt(countRows[0]?.total ?? '0', 10)

  const mappedAppointments = appointments.map((a) => ({
    ...a,
    consultation_fee: a.consultation_fee != null ? parseInt(a.consultation_fee, 10) : null,
    payment_status: (a.payment_status ?? 'unpaid') as 'paid' | 'unpaid',
  }))

  return NextResponse.json({
    appointments: mappedAppointments,
    pagination: {
      total,
      page,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    },
  })
}
