import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { ToastProvider } from '@/components/ui/ToastProvider'
import { WhatsAppPendingBanner } from '@/components/layout/WhatsAppPendingBanner'
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

  // Fetch clinic info for the shell and banner
  let clinicName: string | undefined
  let whatsappConnected = true // default to true so banner doesn't show unless we confirm it's false
  if (session.user.clinicId) {
    const clinic = await db.clinic.findUnique({
      where: { id: session.user.clinicId },
      select: { name: true, whatsappConnected: true, onboardingComplete: true },
    })
    clinicName = clinic?.name
    // Show banner only if onboarding is complete but WhatsApp is not connected
    whatsappConnected = clinic?.whatsappConnected ?? false
  }

  const showWhatsAppBanner = !!session.user.clinicId && !whatsappConnected

  return (
    <ToastProvider>
      <DashboardShell
        clinicName={clinicName}
        userName={session.user.name ?? undefined}
        userRole={session.user.role ?? undefined}
        whatsAppBanner={<WhatsAppPendingBanner show={showWhatsAppBanner} />}
      >
        {children}
      </DashboardShell>
    </ToastProvider>
  )
}
