import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AdminClient } from './AdminClient'

/**
 * /admin — Super Admin clinic list.
 * Access controlled at middleware: only users with system_role = 'super_admin'.
 */
export default async function AdminPage() {
  const session = await auth()
  if (!session?.user || session.user.systemRole !== 'super_admin') {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center gap-3">
          <h1 className="text-[20px] font-semibold text-foreground">Admin Panel</h1>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
            Super Admin
          </span>
        </div>
        <AdminClient />
      </div>
    </div>
  )
}
