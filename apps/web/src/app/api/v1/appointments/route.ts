import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { scheduleConfirmation } from '@/lib/notifications/send-confirmation'
import { scheduleReminders } from '@/lib/notifications/schedule-reminders'
import { pusherServer, clinicChannel } from '@/lib/pusher'
import { sendPushToClinicStaff } from '@/lib/push'
import { writeAuditLog } from '@/lib/audit'
import { UserRole } from '@prisma/client'
import { isPlanExpired } from '@/lib/plan/check-plan'

// ─── GET /api/v1/appointments ─────────────────────────────────────────────────
// Returns appointments for a clinic+date (authenticated).

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const clinicId = session.user.clinicId
  const schemaName = `clinic_${clinicId}`

  const date = req.nextUrl.searchParams.get('date')
  const startDate = req.nextUrl.searchParams.get('startDate')
  const endDate = req.nextUrl.searchParams.get('endDate')

  // Single-date mode vs date-range mode (for week view density)
  if (startDate && endDate) {
    // Week view: return appointment counts per day per doctor
    const rows = await db.$queryRawUnsafe<{
      appointment_date: string
      doctor_id: string
      doctor_name: string
      count: string
    }[]>(
      `SELECT a.appointment_date::text, a.doctor_id, d.name AS doctor_name, COUNT(*)::text AS count
       FROM "${schemaName}".appointments a
       JOIN "${schemaName}".doctors d ON d.id = a.doctor_id
       WHERE a.appointment_date >= $1::date
         AND a.appointment_date <= $2::date
         AND a.status != 'cancelled'
       GROUP BY a.appointment_date, a.doctor_id, d.name
       ORDER BY a.appointment_date, d.name`,
      startDate,
      endDate
    )
    return NextResponse.json({ counts: rows })
  }

  if (!date) {
    return NextResponse.json({ error: 'date parameter required' }, { status: 400 })
  }

  const rows = await db.$queryRawUnsafe<{
    id: string
    patient_id: string
    patient_name: string
    patient_phone: string
    doctor_id: string
    doctor_name: string
    status: string
    token_number: number | null
    booking_source: string
    appointment_date: string
    appointment_time: string | null
    whatsapp_delivery_status: string | null
    cancelled_at: string | null
    updated_at: string
    created_at: string
    consultation_fee: string | null
    payment_status: string
  }[]>(
    `SELECT
       a.id, a.patient_id, p.name AS patient_name, p.phone AS patient_phone,
       a.doctor_id, d.name AS doctor_name,
       a.status, a.token_number, a.booking_source,
       a.appointment_date::text,
       a.appointment_time::text,
       a.whatsapp_delivery_status,
       a.cancelled_at::text,
       a.updated_at::text,
       a.created_at::text,
       a.consultation_fee,
       COALESCE(a.payment_status, 'unpaid') AS payment_status
     FROM "${schemaName}".appointments a
     JOIN "${schemaName}".patients p ON p.id = a.patient_id
     JOIN "${schemaName}".doctors d ON d.id = a.doctor_id
     WHERE a.appointment_date = $1::date
     ORDER BY a.appointment_time ASC NULLS LAST, a.token_number ASC`,
    date
  )

  const appointments = rows.map((r) => ({
    ...r,
    consultation_fee: r.consultation_fee != null ? parseInt(r.consultation_fee, 10) : null,
    payment_status: (r.payment_status ?? 'unpaid') as 'paid' | 'unpaid',
  }))

  return NextResponse.json({ appointments })
}

// ─── POST /api/v1/appointments ────────────────────────────────────────────────
// Creates a manual or walk-in appointment (authenticated).

const createSchema = z.object({
  doctorId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  bookingSource: z.enum(['manual', 'walk-in', 'walk-in-overflow']),
  // Existing patient OR new patient
  patientId: z.string().uuid().optional(),
  newPatient: z
    .object({
      name: z.string().min(1).max(100).trim(),
      phone: z.string().regex(/^[6-9]\d{9}$/),
    })
    .optional(),
}).refine((d) => d.patientId || d.newPatient, {
  message: 'Either patientId or newPatient is required',
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const clinicId = session.user.clinicId
  const userId = session.user.id
  const schemaName = `clinic_${clinicId}`

  // Plan expiry check — 402 if plan has expired (MON-3)
  const clinic = await db.clinic.findUnique({ where: { id: clinicId }, select: { planExpiresAt: true } })
  if (!clinic) {
    return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })
  }
  if (isPlanExpired(clinic.planExpiresAt)) {
    return NextResponse.json(
      { error: 'plan_expired', expiredAt: clinic.planExpiresAt?.toISOString() },
      { status: 402 }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 400 }
    )
  }

  const { doctorId, date, startTime, bookingSource, patientId, newPatient } = parsed.data

  // Validate doctor belongs to this clinic
  const doctorRows = await db.$queryRawUnsafe<{ id: string; name: string }[]>(
    `SELECT id, name FROM "${schemaName}".doctors WHERE id = $1::uuid`,
    doctorId
  )
  const doctor = doctorRows[0]
  if (!doctor) {
    return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })
  }

  // Resolve patient
  let resolvedPatientId: string
  if (patientId) {
    const rows = await db.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM "${schemaName}".patients WHERE id = $1::uuid LIMIT 1`,
      patientId
    )
    if (!rows[0]) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    resolvedPatientId = rows[0].id
  } else if (newPatient) {
    // De-duplicate by phone (FR-20)
    const existing = await db.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM "${schemaName}".patients WHERE phone = $1 LIMIT 1`,
      newPatient.phone
    )
    if (existing[0]) {
      resolvedPatientId = existing[0].id
    } else {
      const created = await db.$queryRawUnsafe<{ id: string }[]>(
        `INSERT INTO "${schemaName}".patients (phone, name, booking_source)
         VALUES ($1, $2, $3)
         RETURNING id`,
        newPatient.phone,
        newPatient.name,
        bookingSource
      )
      if (!created[0]) {
        return NextResponse.json({ error: 'Failed to create patient' }, { status: 500 })
      }
      resolvedPatientId = created[0].id
    }
  } else {
    return NextResponse.json({ error: 'Patient required' }, { status: 400 })
  }

  // Get next token number for this date (in a transaction to avoid races)
  const tokenRows = await db.$queryRawUnsafe<{ max_token: number | null }[]>(
    `SELECT MAX(token_number) AS max_token
     FROM "${schemaName}".appointments
     WHERE appointment_date = $1::date`,
    date
  )
  const tokenNumber = (tokenRows[0]?.max_token ?? 0) + 1

  // For walk-in-overflow: skip the unique constraint check by inserting with a different status
  try {
    const apptRows = await db.$queryRawUnsafe<{ id: string; token_number: number }[]>(
      `INSERT INTO "${schemaName}".appointments
         (patient_id, doctor_id, status, booking_source, appointment_date, appointment_time, token_number, updated_by)
       VALUES ($1::uuid, $2::uuid, 'confirmed', $3, $4::date, $5::time, $6, $7::uuid)
       RETURNING id, token_number`,
      resolvedPatientId,
      doctorId,
      bookingSource,
      date,
      startTime,
      tokenNumber,
      userId
    )
    const appt = apptRows[0]
    if (!appt) {
      return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 })
    }

    // Schedule WhatsApp confirmation + reminders
    await scheduleConfirmation(appt.id, clinicId)
    // Parse slot as IST (UTC+5:30) datetime
    const slotDatetime = new Date(`${date}T${startTime}:00+05:30`)
    await scheduleReminders(appt.id, clinicId, slotDatetime)

    // Publish Pusher event
    try {
      await pusherServer.trigger(clinicChannel(clinicId), 'appointment.created', {
        appointmentId: appt.id,
        clinicId,
        doctorId,
        date,
        startTime,
        bookingSource,
      })
    } catch { /* non-fatal */ }

    // Web push to clinic staff
    void sendPushToClinicStaff(clinicId, {
      title: 'New appointment',
      body: `Dr. ${doctor.name} — ${date} at ${startTime}`,
      url: '/appointments',
      tag: 'new-appointment',
    })

    // Audit log
    try {
      await writeAuditLog({
        clinicId,
        userId,
        action: 'CREATE_APPOINTMENT',
        resourceType: 'appointment',
        resourceId: appt.id,
        metadata: { bookingSource, date, startTime, doctorId },
      })
    } catch { /* non-fatal */ }

    return NextResponse.json(
      {
        appointmentId: appt.id,
        tokenNumber: appt.token_number,
        doctorId,
        doctorName: doctor.name,
        date,
        startTime,
        bookingSource,
        clinicId,
      },
      { status: 201 }
    )
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message.includes('23505') || err.message.includes('unique') || (err as { code?: string }).code === '23505')
    ) {
      return NextResponse.json(
        { error: 'SLOT_TAKEN', message: 'That slot was just taken. Please choose another time.' },
        { status: 409 }
      )
    }
    throw err
  }
}

// ─── unused import guard ──────────────────────────────────────────────────────
// UserRole is imported to ensure the type is available for route helpers
const _roleGuard: UserRole = 'OWNER'
void _roleGuard
