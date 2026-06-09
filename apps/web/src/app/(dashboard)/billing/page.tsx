import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const metadata = { title: 'Billing' }

export default async function BillingPage() {
  const session = await auth()

  if (!session?.user?.clinicId) {
    redirect('/login')
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[var(--color-text)] font-display">Billing</h1>
        <p className="text-sm text-[var(--color-text-3)] mt-0.5">Manage invoices and payment records.</p>
      </div>

      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 bg-white border border-[var(--color-border)] rounded-xl p-8 text-center">
        <div className="w-12 h-12 bg-[var(--color-bg)] rounded-xl flex items-center justify-center">
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="text-[var(--color-text-3)]">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
          </svg>
        </div>
        <h2 className="text-base font-semibold text-[var(--color-text)]">Billing is coming soon</h2>
        <p className="text-sm text-[var(--color-text-3)] max-w-xs">
          You can already record consultation fees and payment status on individual appointments.
          Full billing and invoice management will be available in an upcoming release.
        </p>
      </div>
    </div>
  )
}
