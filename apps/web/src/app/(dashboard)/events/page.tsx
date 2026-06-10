import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { fetchEventAggregates } from '@/lib/events/aggregates'
import { EventsListClient } from '@/components/events/EventsListClient'

export const metadata = { title: 'Events' }

export default async function EventsPage() {
  const session = await auth()
  if (!session?.user?.clinicId) redirect('/login')

  const clinicId = session.user.clinicId
  const aggregates = await fetchEventAggregates(clinicId)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-foreground tracking-tight">Events</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Manage clinic events, workshops, and health camps
          </p>
        </div>
      </div>

      <EventsListClient initialAggregates={aggregates} />
    </div>
  )
}
