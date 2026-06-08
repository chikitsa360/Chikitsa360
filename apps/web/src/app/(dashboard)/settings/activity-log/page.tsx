import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ActivityLog } from '@/components/appointments/ActivityLog'

/**
 * Settings → Activity Log (Story 5.4, CR-12).
 * Read-only immutable audit log. Owner-only.
 */
export default async function ActivityLogPage() {
  const session = await auth()
  if (!session?.user?.clinicId) redirect('/login')
  if (session.user.role !== 'OWNER') redirect('/dashboard')

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
