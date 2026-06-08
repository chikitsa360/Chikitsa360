import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { scheduleConfirmation } from '@/lib/notifications/send-confirmation'
import { scheduleReminders } from '@/lib/notifications/schedule-reminders'
import { pusherServer, clinicChannel } from '@/lib/pusher'

const bookingSchema = z.object({
  clinicSlug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  doctorId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  patientName: z.string().min(1).max(100).trim(),
  patientPhone: z.string().regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number'),
})

/**
 * POST /api/v1/booking
 * Public endpoint — creates a web booking appointment.
 * No auth required. Handles patient de-duplication and slot race conditions.
 */
export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = bookingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 400 }
    )
  }

  const { clinicSlug, doctorId, date, startTime, patientName, patientPhone } = parsed.data

  // Resolve clinic
  const clinic = await db.clinic.findUnique({
    where: { slug: clinicSlug },
    select: { id: true, trialEndsAt: true },
  })

  if (!clinic) {
    return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })
  }

  // Soft paywall check (MON-3)
  if (clinic.trialEndsAt !== null && clinic.trialEndsAt < new Date()) {
    return NextResponse.json(
      { error: 'Online booking is temporarily unavailable. Please contact the clinic directly.' },
      { status: 403 }
    )
  }

  const clinicId = clinic.id
  const schemaName = `clinic_${clinicId}`

  // Validate doctor belongs to this clinic
  const doctorRows = await db.$queryRawUnsafe<{ id: string; name: string }[]>(
    `SELECT id, name FROM "${schemaName}".doctors WHERE id = $1`,
    doctorId
  )
  const doctor = doctorRows[0]
  if (!doctor) {
    return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })
  }

  // Patient de-duplication (FR-20): match by phone
  let patientId: string
  const existingPatient = await db.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM "${schemaName}".patients WHERE phone = $1 LIMIT 1`,
    patientPhone
  )
  const existing = existingPatient[0]
  if (existing) {
    patientId = existing.id
  } else {
    // Create new patient
    const newPatient = await db.$queryRawUnsafe<{ id: string }[]>(
      `INSERT INTO "${schemaName}".patients (phone, name, booking_source)
       VALUES ($1, $2, 'web')
       RETURNING id`,
      patientPhone,
      patientName
    )
    const created = newPatient[0]
    if (!created) {
      return NextResponse.json({ error: 'Failed to create patient' }, { status: 500 })
    }
    patientId = created.id
  }

  // Get next token number for today
  const tokenRows = await db.$queryRawUnsafe<{ max_token: number | null }[]>(
    `SELECT MAX(token_number) AS max_token
     FROM "${schemaName}".appointments
     WHERE appointment_date = $1::date`,
    date
  )
  const maxToken = tokenRows[0]?.max_token ?? 0
  const tokenNumber = maxToken + 1

  // Insert appointment with race condition protection via UNIQUE constraint
  // (doctor_id, appointment_date, appointment_time) must be unique per schema
  try {
    const apptRows = await db.$queryRawUnsafe<{ id: string }[]>(
      `INSERT INTO "${schemaName}".appointments
         (patient_id, doctor_id, status, booking_source, appointment_date, appointment_time, token_number)
       VALUES ($1, $2, 'confirmed', 'web', $3::date, $4::time, $5)
       RETURNING id`,
      patientId,
      doctorId,
      date,
      startTime,
      tokenNumber
    )
    const appt = apptRows[0]
    if (!appt) {
      return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 })
    }

    // Schedule WhatsApp confirmation + reminders (Story 3.4, Story 7.1)
    await scheduleConfirmation(appt.id, clinicId)
    const slotDatetime = new Date(`${date}T${startTime}:00+05:30`)
    await scheduleReminders(appt.id, clinicId, slotDatetime)

    // Publish real-time event to portal subscribers (Story 4.2)
    try {
      await pusherServer.trigger(
        clinicChannel(clinicId),
        'appointment.created',
        {
          appointmentId: appt.id,
          clinicId,
          doctorId,
          date,
          startTime,
          bookingSource: 'web',
        }
      )
    } catch {
      // Non-fatal — portal will pick up on next poll
    }

    return NextResponse.json({
      appointmentId: appt.id,
      tokenNumber,
      doctorId,
      doctorName: doctor.name,
      date,
      startTime,
      clinicId,
    }, { status: 201 })
  } catch (err) {
    // Unique constraint violation → slot was taken by concurrent booking
    if (
      err instanceof Error &&
      err.message.includes('unique') ||
      (err as { code?: string }).code === '23505'
    ) {
      return NextResponse.json(
        { error: 'SLOT_TAKEN', message: 'Sorry, that slot was just taken. Please choose another time.' },
        { status: 409 }
      )
    }
    throw err
  }
}
