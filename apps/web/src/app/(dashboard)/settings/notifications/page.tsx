import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { NotificationsClient } from './NotificationsClient'

/**
 * Settings → Notifications page (RSC).
 * Loads reminder toggle state + opt-out count server-side.
 */
export default async function NotificationsSettingsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!session.user.clinicId) redirect('/onboarding')

  const clinic = await db.clinic.findUnique({
    where: { id: session.user.clinicId },
    select: {
      reminder24hEnabled: true,
      reminder2hEnabled: true,
      eventReminder24hEnabled: true,
    },
  })

  if (!clinic) redirect('/onboarding')

  // Opt-out count from tenant schema
  const schemaName = `clinic_${session.user.clinicId}`
  let optOutCount = 0
  try {
    const rows = await db.$queryRawUnsafe<{ count: string }[]>(
      `SELECT COUNT(*)::text AS count FROM "${schemaName}".patients WHERE whatsapp_opt_out_at IS NOT NULL`
    )
    optOutCount = parseInt(rows[0]?.count ?? '0', 10)
  } catch { /* table may not exist */ }

  return (
    <NotificationsClient
      reminder24hEnabled={clinic.reminder24hEnabled}
      reminder2hEnabled={clinic.reminder2hEnabled}
      eventReminder24hEnabled={clinic.eventReminder24hEnabled}
      optOutCount={optOutCount}
    />
  )
}
