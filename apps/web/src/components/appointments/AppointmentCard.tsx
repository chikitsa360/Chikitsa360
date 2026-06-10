'use client'

import type { Appointment } from '@/app/(dashboard)/appointments/CalendarClient'

interface AppointmentCardProps {
  appointment: Appointment
  onClick: (appointment: Appointment) => void
  animate?: boolean
}

export function statusBadgeClass(status: string): string {
  switch (status) {
    case 'confirmed': return 'bg-blue-50 text-blue-700'
    case 'completed': return 'bg-green-50 text-green-700'
    case 'cancelled': return 'bg-neutral-100 text-neutral-400 line-through'
    case 'no-show': return 'bg-amber-50 text-amber-700'
    default: return 'bg-muted text-muted-foreground'
  }
}

export function statusBorderColor(status: string): string {
  switch (status) {
    case 'confirmed': return 'border-l-blue-500'
    case 'completed': return 'border-l-green-500'
    case 'cancelled': return 'border-l-neutral-400'
    case 'no-show': return 'border-l-amber-500'
    default: return 'border-l-border'
  }
}

function formatTime(time: string | null): string {
  if (!time) return '—'
  const [hStr, mStr] = time.split(':')
  const h = parseInt(hStr ?? '0', 10)
  const m = mStr?.slice(0, 2) ?? '00'
  const period = h >= 12 ? 'PM' : 'AM'
  const displayH = h % 12 || 12
  return `${displayH}:${m} ${period}`
}


function bookingSourceBadge(source: string): string {
  switch (source) {
    case 'whatsapp': return 'WhatsApp'
    case 'web': return 'Web'
    case 'walk-in': return 'Walk-in'
    case 'walk-in-overflow': return 'Walk-in ⚠'
    case 'manual': return 'Manual'
    default: return source
  }
}

export function AppointmentCard({ appointment, onClick, animate }: AppointmentCardProps) {
  const isCancelled = appointment.status === 'cancelled'

  return (
    <button
      onClick={() => onClick(appointment)}
      aria-label={`Appointment: ${appointment.patient_name} at ${formatTime(appointment.appointment_time)}`}
      className={[
        'w-full text-left rounded-lg border-l-4 bg-card px-3 py-2.5 shadow-sm',
        'hover:bg-neutral-50 hover:shadow transition-all duration-150',
        'min-h-[44px]',
        statusBorderColor(appointment.status),
        animate ? 'animate-in fade-in slide-in-from-top-1 duration-250' : '',
      ].join(' ')}
    >
      <div className="flex items-start gap-2">
        {/* Token number */}
        {appointment.token_number !== null && (
          <span className="mt-0.5 flex h-5 min-w-[20px] items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary flex-shrink-0">
            #{appointment.token_number}
          </span>
        )}

        <div className="flex-1 min-w-0">
          {/* Patient name */}
          <div className={`text-[14px] font-semibold leading-tight ${isCancelled ? 'line-through text-neutral-400' : 'text-foreground'}`}>
            {appointment.patient_name}
          </div>

          {/* Doctor + time */}
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-muted-foreground">
            <span>{appointment.doctor_name}</span>
            {appointment.appointment_time && (
              <>
                <span className="text-border">·</span>
                <span>{formatTime(appointment.appointment_time)}</span>
              </>
            )}
          </div>
        </div>

        {/* Status badge */}
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${statusBadgeClass(appointment.status)}`}>
          {appointment.status === 'no-show' ? 'No-show' : appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
        </span>
      </div>

      {/* Booking source */}
      <div className="mt-1 text-[11px] text-muted-foreground/70">
        {bookingSourceBadge(appointment.booking_source)}
      </div>
    </button>
  )
}
