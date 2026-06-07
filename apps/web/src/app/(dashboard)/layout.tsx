import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { ToastProvider } from '@/components/ui/ToastProvider'
import { db } from '@/lib/db'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  // Fetch clinic name for the shell
  let clinicName: string | undefined
  if (session.user.clinicId) {
    const clinic = await db.clinic.findUnique({
      where: { id: session.user.clinicId },
      select: { name: true },
    })
    clinicName = clinic?.name
  }

  return (
    <ToastProvider>
      <DashboardShell
        clinicName={clinicName}
        userName={session.user.name ?? undefined}
        userRole={session.user.role ?? undefined}
      >
        {children}
      </DashboardShell>
    </ToastProvider>
  )
}
