import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { OnboardingShell } from '@/components/onboarding/OnboardingShell'
import { WhatsAppSetupStep } from '@/components/onboarding/WhatsAppSetupStep'

export default async function Step4Page() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <OnboardingShell
      currentStep={4}
      title="Connect your WhatsApp Business Number"
      subtitle="Send appointment reminders and confirmations via WhatsApp."
      onBackHref="/onboarding/step-3"
      hideContinue
    >
      <WhatsAppSetupStep
        notifyMetaAppId={process.env.NEXT_PUBLIC_NOTIFY_META_APP_ID}
        notifyEsConfigId={process.env.NEXT_PUBLIC_NOTIFY_ES_CONFIG_ID}
      />
    </OnboardingShell>
  )
}
