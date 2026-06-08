import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { OnboardingShell } from '@/components/onboarding/OnboardingShell'
import { WhatsAppSetupStep } from '@/components/onboarding/WhatsAppSetupStep'

export default async function Step4Page() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const facebookAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID

  return (
    <OnboardingShell
      currentStep={4}
      title="Connect your WhatsApp Business Number"
      subtitle="Send appointment reminders and confirmations via WhatsApp."
      onBackHref="/onboarding/step-3"
      hideContinue
    >
      <WhatsAppSetupStep facebookAppId={facebookAppId} />
    </OnboardingShell>
  )
}
