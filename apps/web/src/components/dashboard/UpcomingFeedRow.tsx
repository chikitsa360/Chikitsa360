import type { UpcomingAppointment } from '@/app/api/v1/dashboard/today/route'

interface UpcomingFeedRowProps {
  appointment: UpcomingAppointment
  onClick?: (id: string) => void
}

const SOURCE_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  whatsapp:         { bg: 'rgba(16,185,129,0.1)',  color: '#059669', label: 'WhatsApp' },
  'walk-in':        { bg: 'rgba(245,158,11,0.1)',  color: '#D97706', label: 'Walk-in' },
  'walk-in-overflow': { bg: 'rgba(245,158,11,0.1)', color: '#D97706', label: 'Walk-in' },
  web:              { bg: 'rgba(59,130,246,0.1)',   color: '#2563EB', label: 'Web' },
  portal:           { bg: 'rgba(100,116,139,0.1)', color: '#475569', label: 'Manual' },
}

function formatTime(t: string): string {
  // t = "HH:MM:SS" or "HH:MM"
  const [h, m] = t.split(':').map(Number)
  if (h === undefined || m === undefined) return t
  const suffix = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`
}

export function UpcomingFeedRow({ appointment, onClick }: UpcomingFeedRowProps) {
  const src = SOURCE_STYLES[appointment.source] ?? SOURCE_STYLES['portal']!

  return (
    <div
      className="flex items-center gap-3 border-b border-border px-5 py-3 hover:bg-muted transition-colors cursor-pointer last:border-b-0"
      onClick={() => onClick?.(appointment.id)}
    >
      {/* Token pill */}
      <span
        className="flex h-7 w-12 shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
        style={{ background: 'rgba(10,110,255,0.1)', color: '#0A6EFF' }}
      >
        #{appointment.token ?? '—'}
      </span>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-foreground truncate">
            {appointment.patientName}
          </span>
          {appointment.isOverdue && (
            <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ background: 'rgba(245,158,11,0.12)', color: '#D97706' }}>
              Overdue
            </span>
          )}
        </div>
        <div className="text-[12px] text-muted-foreground mt-0.5">{appointment.doctorName}</div>
      </div>

      {/* Time */}
      <span className="shrink-0 text-[13px] text-neutral-700" style={{ color: 'var(--color-foreground)', opacity: 0.7 }}>
        {formatTime(appointment.time)}
      </span>

      {/* Source badge */}
      <span
        className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium"
        style={{ background: src.bg, color: src.color }}
      >
        {src.label}
      </span>
    </div>
  )
}
