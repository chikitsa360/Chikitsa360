import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { WizardComplete } from '@/components/onboarding/WizardComplete'

export default async function WizardCompletePage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  // If already complete, redirect to dashboard
  if (session.user.clinicId) {
    const clinic = await db.clinic.findUnique({
      where: { id: session.user.clinicId },
      select: { onboardingComplete: true, slug: true, name: true },
    })

    if (clinic?.onboardingComplete) {
      redirect('/dashboard')
    }

    return <WizardComplete clinicName={clinic?.name ?? undefined} slug={clinic?.slug ?? undefined} />
  }

  return <WizardComplete />
}
