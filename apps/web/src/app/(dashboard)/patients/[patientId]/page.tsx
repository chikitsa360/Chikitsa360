import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { db } from '@/lib/db'
import Link from 'next/link'
import { PatientProfileClient } from './PatientProfileClient'

/**
 * Server Component: fetches patient details server-side for fast LCP.
 * Visit history loaded client-side in PatientProfileClient (React Query-like).
 */
export default async function PatientProfilePage({
  params,
}: {
  params: Promise<{ patientId: string }>
}) {
  const session = await auth()
  if (!session?.user?.clinicId) redirect('/login')

  const { patientId } = await params
  const clinicId = session.user.clinicId
  const schemaName = `clinic_${clinicId}`

  let patient: {
    id: string
    name: string
    phone: string
    dob: string | null
    gender: string | null
    first_visit_reason: string | null
    booking_source: string
    created_at: string
    visit_count: string
    last_visit_date: string | null
  } | undefined

  try {
    const rows = await db.$queryRawUnsafe<typeof patient[]>(
      `SELECT
         p.id, p.name, p.phone, p.dob::text, p.gender,
         p.first_visit_reason, p.booking_source, p.created_at::text,
         COUNT(a.id)::text AS visit_count,
         MAX(a.appointment_date)::text AS last_visit_date
       FROM "${schemaName}".patients p
       LEFT JOIN "${schemaName}".appointments a
         ON a.patient_id = p.id AND a.status != 'cancelled'
       WHERE p.id = $1::uuid
       GROUP BY p.id`,
      patientId
    )
    patient = rows[0]
  } catch {
    // Schema not provisioned or invalid UUID
  }

  if (!patient) notFound()

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-1.5 text-[13px] text-muted-foreground">
        <Link href="/patients" className="hover:text-foreground transition-colors">
          Patients
        </Link>
        <span className="text-border">/</span>
        <span className="font-medium text-foreground">{patient.name}</span>
      </div>

      <PatientProfileClient
        patientId={patient.id}
        name={patient.name}
        phone={patient.phone}
        dob={patient.dob}
        gender={patient.gender}
        firstVisitReason={patient.first_visit_reason}
        bookingSource={patient.booking_source}
        createdAt={patient.created_at}
        visitCount={parseInt(patient.visit_count, 10)}
        lastVisitDate={patient.last_visit_date}
        userRole={session.user.role ?? 'RECEPTIONIST'}
      />
    </div>
  )
}
