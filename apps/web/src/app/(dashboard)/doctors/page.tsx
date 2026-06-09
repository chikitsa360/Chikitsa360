import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const metadata = { title: 'Doctors' }

export default async function DoctorsPage() {
  const session = await auth()

  if (!session?.user?.clinicId) {
    redirect('/login')
  }

  if (session.user.role !== 'OWNER') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <h1 className="text-lg font-semibold text-[var(--color-text)]">Access restricted.</h1>
        <p className="text-sm text-[var(--color-text-3)]">Doctors management is available to Clinic Owners only.</p>
      </div>
    )
  }

  redirect('/settings/doctors')
}
