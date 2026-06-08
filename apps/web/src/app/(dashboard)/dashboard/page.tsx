import * as React from 'react'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { DashboardClient } from './DashboardClient'
import type { DashboardTodayData, UpcomingAppointment } from '@/app/api/v1/dashboard/today/route'

// ── Server-side data fetch ─────────────────────────────────────────────────

async function fetchTodayAggregates(clinicId: string): Promise<DashboardTodayData> {
  const schema = `clinic_${clinicId}`

  const [agg] = await db.$queryRawUnsafe<{
    total: string
    completed: string
    remaining: string
    no_shows: string
    new_patients: string
    returning_patients: string
  }[]>(`
    WITH patient_first AS (
      SELECT patient_id, MIN(appointment_date) AS first_date
      FROM "${schema}".appointments
      WHERE status != 'cancelled' AND is_sample = false
      GROUP BY patient_id
    )
    SELECT
      COUNT(*) FILTER (WHERE a.status != 'cancelled' AND a.is_sample = false)                         AS total,
      COUNT(*) FILTER (WHERE a.status = 'completed'  AND a.is_sample = false)                         AS completed,
      COUNT(*) FILTER (WHERE a.status = 'confirmed'  AND a.is_sample = false
                         AND a.appointment_time > (NOW() AT TIME ZONE 'Asia/Kolkata')::time)           AS remaining,
      COUNT(*) FILTER (WHERE a.status = 'no-show'    AND a.is_sample = false)                         AS no_shows,
      COUNT(DISTINCT a.patient_id) FILTER (WHERE pf.first_date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date)
                                                                                                       AS new_patients,
      COUNT(DISTINCT a.patient_id) FILTER (WHERE pf.first_date < (NOW() AT TIME ZONE 'Asia/Kolkata')::date)
                                                                                                       AS returning_patients
    FROM "${schema}".appointments a
    LEFT JOIN patient_first pf ON pf.patient_id = a.patient_id
    WHERE a.appointment_date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date
  `).catch(() => [{ total: '0', completed: '0', remaining: '0', no_shows: '0', new_patients: '0', returning_patients: '0' }])

  const rows = await db.$queryRawUnsafe<{
    id: string
    token_number: number | null
    patient_name: string
    doctor_name: string
    appointment_time: string
    booking_source: string
    is_overdue: boolean
  }[]>(`
    SELECT
      a.id,
      a.token_number,
      p.name AS patient_name,
      d.name AS doctor_name,
      a.appointment_time::text AS appointment_time,
      a.booking_source,
      (a.appointment_time < (NOW() AT TIME ZONE 'Asia/Kolkata')::time) AS is_overdue
    FROM "${schema}".appointments a
    JOIN "${schema}".patients p ON p.id = a.patient_id
    JOIN "${schema}".doctors d ON d.id = a.doctor_id
    WHERE a.appointment_date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date
      AND a.status = 'confirmed'
      AND a.is_sample = false
    ORDER BY a.appointment_time ASC
    LIMIT 5
  `).catch(() => [])

  const upcoming: UpcomingAppointment[] = rows.map((r) => ({
    id: r.id,
    token: r.token_number,
    patientName: r.patient_name,
    doctorName: r.doctor_name,
    time: r.appointment_time,
    source: r.booking_source,
    isOverdue: r.is_overdue,
  }))

  return {
    total: parseInt(agg?.total ?? '0'),
    completed: parseInt(agg?.completed ?? '0'),
    remaining: parseInt(agg?.remaining ?? '0'),
    noShows: parseInt(agg?.no_shows ?? '0'),
    newPatients: parseInt(agg?.new_patients ?? '0'),
    returning: parseInt(agg?.returning_patients ?? '0'),
    revenue: null,
    pending: 0,
    upcoming,
  }
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const clinicId = session.user.clinicId
  if (!clinicId) redirect('/onboarding')

  const initial = await fetchTodayAggregates(clinicId)

  const firstName = session.user.name?.split(' ')[0] ?? 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div>
      {/* Greeting */}
      <div className="mb-5">
        <div
          className="font-bold text-foreground"
          style={{ fontSize: 20, letterSpacing: '-0.015em' }}
        >
          {greeting}, {firstName}
        </div>
        <div className="mt-1 text-[13px] text-muted-foreground">
          Here&apos;s what&apos;s happening at your clinic today.
        </div>
      </div>

      {/* Client component handles all real-time updates + week toggle */}
      <DashboardClient initial={initial} clinicId={clinicId} />
    </div>
  )
}
