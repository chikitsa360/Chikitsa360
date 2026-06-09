import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const metadata = { title: 'Prescriptions' }

export default async function PrescriptionsPage() {
  const session = await auth()

  if (!session?.user?.clinicId) {
    redirect('/login')
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[var(--color-text)] font-display">Prescriptions</h1>
        <p className="text-sm text-[var(--color-text-3)] mt-0.5">Manage patient prescriptions and medication records.</p>
      </div>

      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 bg-white border border-[var(--color-border)] rounded-xl p-8 text-center">
        <div className="w-12 h-12 bg-[var(--color-bg)] rounded-xl flex items-center justify-center">
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="text-[var(--color-text-3)]">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <h2 className="text-base font-semibold text-[var(--color-text)]">Prescriptions are coming soon</h2>
        <p className="text-sm text-[var(--color-text-3)] max-w-xs">
          Digital prescription management will be available in an upcoming release.
          You can currently add visit notes on completed appointments.
        </p>
      </div>
    </div>
  )
}
