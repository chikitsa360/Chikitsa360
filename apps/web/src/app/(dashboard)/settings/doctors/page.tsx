import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DoctorsSettingsClient } from '@/components/settings/DoctorsSettingsClient'

export default async function DoctorsSettingsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!session.user.clinicId) redirect('/onboarding')

  return <DoctorsSettingsClient clinicId={session.user.clinicId} />
}
