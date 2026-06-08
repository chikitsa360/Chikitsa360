import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { WhatsAppSettings } from '@/components/settings/WhatsAppSettings'

export default async function WhatsAppSettingsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!session.user.clinicId) redirect('/onboarding')

  return <WhatsAppSettings />
}
