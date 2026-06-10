'use client'

import * as React from 'react'

interface WeekDayCounts {
  [date: string]: { [doctorId: string]: { name: string; count: number } }
}

interface WeekViewProps {
  currentDate: string // YYYY-MM-DD — any date in the week
  clinicId: string
  onDayClick: (date: string) => void
}

/**
 * Week view: Mon–Sun density grid (UX-DR7).
 * Shows per-doctor appointment counts per day.
 * Clicking a day navigates to Day View for that date.
 */
export function WeekView({ currentDate, clinicId: _clinicId, onDayClick }: WeekViewProps) {
  const weekDates = getWeekDates(currentDate)
  const [counts, setCounts] = React.useState<WeekDayCounts>({})
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    const startDate = weekDates[0]
    const endDate = weekDates[6]
    if (!startDate || !endDate) return

    setLoading(true)
    fetch(`/api/v1/appointments?startDate=${startDate}&endDate=${endDate}`)
      .then((r) => r.json())
      .then((data: { counts?: { appointment_date: string; doctor_id: string; doctor_name: string; count: string }[] }) => {
        const map: WeekDayCounts = {}
        for (const row of data.counts ?? []) {
          if (!map[row.appointment_date]) map[row.appointment_date] = {}
          map[row.appointment_date]![row.doctor_id] = {
            name: row.doctor_name,
            count: parseInt(row.count, 10),
          }
        }
        setCounts(map)
      })
      .catch(() => { /* ignore */ })
      .finally(() => setLoading(false))
  }, [currentDate]) // eslint-disable-line react-hooks/exhaustive-deps

  const today = getTodayStr()
  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[480px] grid-cols-7 gap-2">
        {weekDates.map((date, i) => {
          const dayLabel = DAY_LABELS[i] ?? ''
          const dayNum = date.split('-')[2] ?? ''
          const isToday = date === today
          const dayDoctors = counts[date] ?? {}
          const totalCount = Object.values(dayDoctors).reduce((s, d) => s + d.count, 0)

          return (
            <button
              key={date}
              onClick={() => onDayClick(date)}
              className={[
                'rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5',
                isToday ? 'border-primary/30 bg-primary/5' : 'border-border',
              ].join(' ')}
            >
              {/* Header */}
              <div className="mb-2 flex items-center justify-between">
                <span className={`text-[10px] font-semibold uppercase tracking-wide ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                  {dayLabel}
                </span>
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold ${isToday ? 'bg-primary text-white' : 'text-foreground'}`}>
                  {dayNum}
                </span>
              </div>

              {/* Count */}
              {loading ? (
                <div className="h-4 w-8 animate-pulse rounded bg-muted" />
              ) : totalCount === 0 ? (
                <span className="text-[12px] text-neutral-400">—</span>
              ) : (
                <div className="space-y-0.5">
                  {Object.values(dayDoctors).map((d) => (
                    <div key={d.name} className="text-[11px] text-muted-foreground">
                      <span className="font-medium text-foreground">{d.count}</span> · {d.name.replace('Dr. ', '')}
                    </div>
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Returns Mon–Sun dates for the week containing the given date (IST-aware).
 * Returns array of 7 YYYY-MM-DD strings starting from Monday.
 */
export function getWeekDates(dateStr: string): string[] {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y ?? 0, (m ?? 1) - 1, d ?? 1)
  // getDay() returns 0=Sun,1=Mon,...,6=Sat; we want Mon=0
  const dayOfWeek = dt.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(dt)
  monday.setDate(dt.getDate() + mondayOffset)

  const dates: string[] = []
  for (let i = 0; i < 7; i++) {
    const d2 = new Date(monday)
    d2.setDate(monday.getDate() + i)
    dates.push(
      `${d2.getFullYear()}-${String(d2.getMonth() + 1).padStart(2, '0')}-${String(d2.getDate()).padStart(2, '0')}`
    )
  }
  return dates
}

function getTodayStr(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
