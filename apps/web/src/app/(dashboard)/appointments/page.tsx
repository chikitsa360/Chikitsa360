import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { CalendarClient } from './CalendarClient'

interface Appointment {
  id: string
  patient_name: string
  patient_phone: string
  doctor_id: string
  doctor_name: string
  status: string
  token_number: number | null
  booking_source: string
  appointment_date: string
  appointment_time: string | null
  consultation_fee: number | null
  payment_status: 'paid' | 'unpaid'
}

interface Doctor {
  id: string
  name: string
  speciality: string | null
  default_fee: number | null
}

/**
 * Server Component: prefetches today's appointments + doctor list for fast initial render.
 * Real-time updates handed off to CalendarClient (Pusher + polling).
 */
export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string }>
}) {
  const session = await auth()
  if (!session?.user?.clinicId) redirect('/login')

  const clinicId = session.user.clinicId
  const schemaName = `clinic_${clinicId}`
  const params = await searchParams

  // Default to today (IST: UTC+5:30)
  const todayUTC = new Date()
  const todayIST = new Date(todayUTC.getTime() + 5.5 * 60 * 60 * 1000)
  const defaultDate = todayIST.toISOString().split('T')[0] as string
  const date = params.date ?? defaultDate
  const view = params.view ?? 'day'

  // Prefetch today's appointments (SSR for fast initial render)
  let initialAppointments: Appointment[] = []
  let doctors: Doctor[] = []

  try {
    const rawAppointments = await db.$queryRawUnsafe<(Appointment & { consultation_fee: string | null })[]>(
      `SELECT
         a.id, p.name AS patient_name, p.phone AS patient_phone,
         a.doctor_id, d.name AS doctor_name,
         a.status, a.token_number, a.booking_source,
         a.appointment_date::text,
         a.appointment_time::text,
         a.consultation_fee,
         COALESCE(a.payment_status, 'unpaid') AS payment_status
       FROM "${schemaName}".appointments a
       JOIN "${schemaName}".patients p ON p.id = a.patient_id
       JOIN "${schemaName}".doctors d ON d.id = a.doctor_id
       WHERE a.appointment_date = $1::date
       ORDER BY a.appointment_time ASC NULLS LAST, a.token_number ASC`,
      date
    )
    initialAppointments = rawAppointments.map((r) => ({
      ...r,
      consultation_fee: r.consultation_fee != null ? parseInt(String(r.consultation_fee), 10) : null,
      payment_status: (r.payment_status ?? 'unpaid') as 'paid' | 'unpaid',
    }))

    doctors = await db.$queryRawUnsafe<Doctor[]>(
      `SELECT id, name, speciality, default_fee::int FROM "${schemaName}".doctors ORDER BY name ASC`
    )
  } catch {
    // Tenant schema may not be provisioned yet
  }

  // planExpiresAt comes from the JWT — no extra DB call needed (AC7, AC18)
  const planExpiresAt = (session.user as { planExpiresAt?: string | null }).planExpiresAt ?? null

  return (
    <CalendarClient
      clinicId={clinicId}
      userId={session.user.id}
      userRole={session.user.role}
      initialDate={date}
      initialView={view as 'day' | 'week'}
      initialAppointments={initialAppointments}
      doctors={doctors}
      planExpiresAt={planExpiresAt}
    />
  )
}
