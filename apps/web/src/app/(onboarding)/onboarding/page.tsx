import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'

export default async function OnboardingIndexPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  // If no clinic yet → step-1
  if (!session.user.clinicId) {
    redirect('/onboarding/step-1')
  }

  const clinic = await db.clinic.findUnique({
    where: { id: session.user.clinicId },
    select: { onboardingStep: true, onboardingComplete: true },
  })

  if (!clinic || clinic.onboardingComplete) {
    redirect('/dashboard')
  }

  // Route to the first incomplete step
  const step = clinic.onboardingStep ?? 1
  if (step >= 4) redirect('/onboarding/step-4')
  if (step >= 3) redirect('/onboarding/step-3')
  if (step >= 2) redirect('/onboarding/step-2')
  redirect('/onboarding/step-1')
}
