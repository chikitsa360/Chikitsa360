import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { WorkingHoursSettingsClient } from '@/components/settings/WorkingHoursSettingsClient'

export default async function WorkingHoursSettingsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!session.user.clinicId) redirect('/onboarding')

  return <WorkingHoursSettingsClient />
}
