import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST() {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const clinicId = session.user.clinicId
  const schemaName = `clinic_${clinicId}`

  // Get the first doctor for the sample appointment
  const doctors = await db.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM "${schemaName}".doctors ORDER BY created_at ASC LIMIT 1`
  )

  const firstDoctor = doctors[0]
  if (firstDoctor) {
    const doctorId = firstDoctor.id

    // Create a placeholder patient if not exists
    const existingPatient = await db.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM "${schemaName}".patients WHERE phone = $1 LIMIT 1`,
      '0000000000'
    )

    let patientId: string
    const existing = existingPatient[0]
    if (existing) {
      patientId = existing.id
    } else {
      const newPatient = await db.$queryRawUnsafe<{ id: string }[]>(
        `INSERT INTO "${schemaName}".patients (phone, name, is_placeholder)
         VALUES ($1, $2, true) RETURNING id`,
        '0000000000',
        'Sample Patient'
      )
      const created = newPatient[0]
      if (!created) throw new Error('Failed to create placeholder patient')
      patientId = created.id
    }

    // Calculate tomorrow's date
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowDate = tomorrow.toISOString().split('T')[0]

    // Create sample appointment
    await db.$executeRawUnsafe(
      `INSERT INTO "${schemaName}".appointments
         (patient_id, doctor_id, status, booking_source, appointment_date, is_sample)
       VALUES ($1, $2, 'confirmed', 'sample', $3, true)`,
      patientId,
      doctorId,
      tomorrowDate,
    )
  }

  // Mark onboarding complete
  const clinic = await db.clinic.update({
    where: { id: clinicId },
    data: { onboardingComplete: true, onboardingStep: 5 },
    select: { slug: true, name: true },
  })

  return NextResponse.json({ ok: true, slug: clinic.slug, clinicName: clinic.name })
}
