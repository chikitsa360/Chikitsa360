import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * GET /api/v1/patients/by-phone?phone={phone}
 * Authenticated. Returns existing patient by phone (tenant-scoped).
 * Used by Manual Appointment and Walk-In panels for patient de-duplication (FR-20).
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const phone = req.nextUrl.searchParams.get('phone')
  if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
    return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
  }

  const clinicId = session.user.clinicId
  const schemaName = `clinic_${clinicId}`

  // Look up patient by phone
  const patientRows = await db.$queryRawUnsafe<{
    id: string
    name: string
    phone: string
    dob: string | null
    gender: string | null
    created_at: string
  }[]>(
    `SELECT id, name, phone, dob::text, gender, created_at::text
     FROM "${schemaName}".patients
     WHERE phone = $1 LIMIT 1`,
    phone
  )

  const patient = patientRows[0]
  if (!patient) {
    return NextResponse.json({ patient: null })
  }

  // Fetch most recent appointment(s) for visit history
  const visitRows = await db.$queryRawUnsafe<{
    appointment_date: string
    doctor_name: string
    status: string
  }[]>(
    `SELECT a.appointment_date::text, d.name AS doctor_name, a.status
     FROM "${schemaName}".appointments a
     JOIN "${schemaName}".doctors d ON d.id = a.doctor_id
     WHERE a.patient_id = $1::uuid
     ORDER BY a.appointment_date DESC
     LIMIT 5`,
    patient.id
  )

  return NextResponse.json({
    patient: {
      id: patient.id,
      name: patient.name,
      phone: patient.phone,
      dob: patient.dob,
      gender: patient.gender,
      recentVisits: visitRows,
    },
  })
}
