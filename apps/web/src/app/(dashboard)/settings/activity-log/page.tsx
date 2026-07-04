import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ActivityLog } from '@/components/appointments/ActivityLog'

/**
 * Settings → Activity Log (Story 5.4, CR-12).
 * Read-only immutable audit log. Owner-only.
 */
export default async function ActivityLogPage() {
  let session
  try {
    session = await auth()
  } catch (err) {
    console.error('[ActivityLogPage] Auth failed:', err)
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4m0 4h.01" />
          </svg>
        </div>
        <h2 className="text-[16px] font-semibold text-foreground">Unable to load</h2>
        <p className="mt-1 text-[13px] text-muted-foreground max-w-xs">Please refresh the page.</p>
      </div>
    )
  }

  if (!session?.user?.clinicId) redirect('/login')
  if (session.user.role !== 'OWNER') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        </div>
        <h2 className="text-[16px] font-semibold text-foreground">Owner Access Only</h2>
        <p className="mt-1 text-[13px] text-muted-foreground max-w-xs">
          Activity log can only be viewed by the clinic owner.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold text-foreground">Activity Log</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Immutable record of all appointment and scheduling changes.
        </p>
      </div>
      <ActivityLog clinicId={session.user.clinicId} />
    </div>
  )
}
