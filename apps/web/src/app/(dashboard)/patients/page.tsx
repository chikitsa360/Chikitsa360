import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { PatientDirectoryClient } from './PatientDirectoryClient'
import type { PatientRow } from '@/components/patients/PatientDirectoryTable'

/**
 * Server Component: prefetches first page of patients for fast initial render.
 * Search and pagination are client-side (PatientDirectoryClient).
 */
export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const session = await auth()
  if (!session?.user?.clinicId) redirect('/login')

  const clinicId = session.user.clinicId
  const schemaName = `clinic_${clinicId}`
  const params = await searchParams
  const page = parseInt(params.page ?? '1', 10)
  const limit = 20
  const offset = (Math.max(page, 1) - 1) * limit

  let patients: PatientRow[] = []
  let total = 0

  try {
    const [countRows, rows] = await Promise.all([
      db.$queryRawUnsafe<{ total: string }[]>(
        `SELECT COUNT(*)::text AS total FROM "${schemaName}".patients`
      ),
      db.$queryRawUnsafe<PatientRow[]>(
        `SELECT
           p.id, p.name, p.phone, p.dob::text, p.gender,
           p.booking_source, p.created_at::text,
           MAX(a.appointment_date)::text AS last_visit_date,
           (SELECT d.name FROM "${schemaName}".doctors d
            JOIN "${schemaName}".appointments la ON la.doctor_id = d.id
            WHERE la.patient_id = p.id AND la.status = 'completed'
            ORDER BY la.appointment_date DESC LIMIT 1) AS last_doctor_name,
           COUNT(a.id)::text AS visit_count
         FROM "${schemaName}".patients p
         LEFT JOIN "${schemaName}".appointments a
           ON a.patient_id = p.id AND a.status != 'cancelled'
         GROUP BY p.id
         ORDER BY p.name ASC
         LIMIT $1 OFFSET $2`,
        limit,
        offset
      ),
    ])
    patients = rows
    total = parseInt(countRows[0]?.total ?? '0', 10)
  } catch {
    // Tenant schema not yet provisioned
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-foreground tracking-tight">Patients</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {total > 0 ? `${total} patients registered` : 'No patients yet'}
          </p>
        </div>
      </div>

      <PatientDirectoryClient
        initialPatients={patients}
        pagination={{
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        }}
      />
    </div>
  )
}
