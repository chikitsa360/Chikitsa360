import Link from 'next/link'
import type { UpcomingAppointment } from '@/app/api/v1/dashboard/today/route'
import { UpcomingFeedRow } from './UpcomingFeedRow'

interface UpcomingFeedProps {
  appointments: UpcomingAppointment[]
  onRowClick?: (id: string) => void
}

export function UpcomingFeed({ appointments, onRowClick }: UpcomingFeedProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="text-[14px] font-semibold text-foreground">Upcoming Today</div>
        <Link
          href="/appointments"
          className="text-[12px] font-medium text-primary hover:underline"
        >
          View all →
        </Link>
      </div>

      {appointments.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
          <p className="text-[13px] text-muted-foreground">No upcoming appointments today.</p>
          <Link
            href="/appointments"
            className="rounded-md bg-primary px-3 py-1.5 text-[12px] font-medium text-white hover:bg-primary/90 transition-colors"
          >
            + New Appointment
          </Link>
        </div>
      ) : (
        appointments.map((appt) => (
          <UpcomingFeedRow key={appt.id} appointment={appt} onClick={onRowClick} />
        ))
      )}
    </div>
  )
}
