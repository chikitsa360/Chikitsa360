import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { ToastProvider } from '@/components/ui/ToastProvider'
import { WhatsAppPendingBanner } from '@/components/layout/WhatsAppPendingBanner'
import { PlanBanner } from '@/components/layout/PlanBanner'
import { db } from '@/lib/db'
import { getPlanStatus } from '@/lib/plan/check-plan'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  // Fetch clinic info for the shell and banners
  let clinicName: string | undefined
  let clinicLogoUrl: string | null = null
  let whatsappConnected = true // default to true so banner doesn't show unless we confirm it's false
  let planExpiresAt: Date | null = null
  if (session.user.clinicId) {
    const clinic = await db.clinic.findUnique({
      where: { id: session.user.clinicId },
      select: { name: true, whatsappConnected: true, onboardingComplete: true, planExpiresAt: true },
    })
    clinicName = clinic?.name
    // Show banner only if onboarding is complete but WhatsApp is not connected
    whatsappConnected = clinic?.whatsappConnected ?? false
    planExpiresAt = clinic?.planExpiresAt ?? null

    // Fetch logoUrl separately — pending migration on older deployments won't crash the shell
    try {
      const logoRow = await db.clinic.findUnique({
        where: { id: session.user.clinicId },
        select: { logoUrl: true },
      })
      clinicLogoUrl = logoRow?.logoUrl ?? null
    } catch {
      // Migration not yet applied — sidebar falls back to initials
    }
  }

  const showWhatsAppBanner = !!session.user.clinicId && !whatsappConnected
  const planStatus = getPlanStatus(planExpiresAt)

  return (
    <ToastProvider>
      <DashboardShell
        clinicName={clinicName}
        clinicLogoUrl={clinicLogoUrl}
        userName={session.user.name ?? undefined}
        userRole={session.user.role ?? undefined}
        planBanner={<PlanBanner status={planStatus} expiresAt={planExpiresAt?.toISOString() ?? null} />}
        whatsAppBanner={<WhatsAppPendingBanner show={showWhatsAppBanner} />}
      >
        {children}
      </DashboardShell>
    </ToastProvider>
  )
}
