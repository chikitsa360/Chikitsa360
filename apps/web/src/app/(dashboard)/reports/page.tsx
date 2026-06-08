import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import ReportsClient from './ReportsClient'

export const metadata = { title: 'Reports & Analytics' }

export default async function ReportsPage() {
  const session = await auth()

  if (!session?.user?.clinicId) {
    redirect('/login')
  }

  // Non-owners see restricted page
  if (session.user.role !== 'OWNER') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-12 h-12 bg-[var(--color-bg)] rounded-xl flex items-center justify-center">
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="text-[var(--color-text-3)]">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
          </svg>
        </div>
        <h1 className="text-lg font-semibold text-[var(--color-text)]">Reports are available to Clinic Owners only.</h1>
        <p className="text-sm text-[var(--color-text-3)]">Contact your clinic owner for access to analytics.</p>
      </div>
    )
  }

  // Load doctors list for filter dropdown
  const schema = `clinic_${session.user.clinicId}`
  const doctors = await db.$queryRawUnsafe<{ id: string; name: string }[]>(
    `SELECT id, name FROM "${schema}".doctors ORDER BY name ASC`
  )

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text)] font-display">Reports & Analytics</h1>
          <p className="text-sm text-[var(--color-text-3)] mt-0.5">Track clinic performance across appointments, revenue, and patient growth.</p>
        </div>
      </div>
      <ReportsClient doctors={doctors} />
    </div>
  )
}
