'use client'

import * as React from 'react'
import { AppointmentCard } from './AppointmentCard'
import type { Appointment } from '@/app/(dashboard)/appointments/CalendarClient'

interface DayViewProps {
  date: string
  appointments: Appointment[]
  onAppointmentClick: (appointment: Appointment) => void
  onNewAppointment: () => void
  liveUpdateCount: number
}

export function DayView({
  date,
  appointments,
  onAppointmentClick,
  onNewAppointment,
  liveUpdateCount,
}: DayViewProps) {
  // Track which appointments are new (for animation)
  const prevAppointmentIds = React.useRef(new Set(appointments.map((a) => a.id)))
  const [newIds, setNewIds] = React.useState(new Set<string>())

  React.useEffect(() => {
    if (liveUpdateCount === 0) return
    const currentIds = new Set(appointments.map((a) => a.id))
    const added = new Set<string>()
    for (const id of currentIds) {
      if (!prevAppointmentIds.current.has(id)) added.add(id)
    }
    prevAppointmentIds.current = currentIds
    if (added.size > 0) {
      setNewIds(added)
      setTimeout(() => setNewIds(new Set()), 2000)
    }
  }, [appointments, liveUpdateCount])

  if (appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 text-center">
        <svg className="mb-3 h-10 w-10 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        <p className="text-[14px] font-medium text-muted-foreground">
          No appointments scheduled for this day.
        </p>
        <button
          onClick={onNewAppointment}
          className="mt-4 flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-white hover:bg-primary/90 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Appointment
        </button>
      </div>
    )
  }

  // Sort by time
  const sorted = [...appointments].sort((a, b) => {
    if (!a.appointment_time) return 1
    if (!b.appointment_time) return -1
    return a.appointment_time.localeCompare(b.appointment_time)
  })

  return (
    <div className="space-y-2">
      {sorted.map((appt) => (
        <AppointmentCard
          key={appt.id}
          appointment={appt}
          onClick={onAppointmentClick}
          animate={newIds.has(appt.id)}
        />
      ))}
    </div>
  )
}
