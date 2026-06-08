'use client'

export interface Slot {
  doctorId: string
  doctorName: string
  date: string // YYYY-MM-DD
  startTime: string // HH:mm
  endTime: string // HH:mm
}

interface SlotGridProps {
  slots: Slot[]
  selectedSlot: Slot | null
  onSelect: (slot: Slot) => void
}

/**
 * Groups slots by date and renders a grid of time-slot buttons.
 * Date headers: "Today", "Tomorrow", "Mon, 9 Jun" etc.
 */
export function SlotGrid({ slots, selectedSlot, onSelect }: SlotGridProps) {
  if (slots.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card px-5 py-8 text-center">
        <p className="text-[14px] text-muted-foreground">
          No appointments available right now.
        </p>
      </div>
    )
  }

  const grouped = groupByDate(slots)
  const today = new Date()
  const todayStr = toDateStr(today)
  const tomorrowStr = toDateStr(new Date(today.getTime() + 86400000))

  return (
    <div className="space-y-5">
      {Object.entries(grouped).map(([date, dateSlots]) => (
        <div key={date}>
          <h3 className="mb-2 border-b border-border pb-1.5 text-[13px] font-semibold text-foreground">
            {formatDateHeader(date, todayStr, tomorrowStr)}
          </h3>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
            {dateSlots.map((slot) => {
              const isSelected =
                selectedSlot?.doctorId === slot.doctorId &&
                selectedSlot?.date === slot.date &&
                selectedSlot?.startTime === slot.startTime

              return (
                <button
                  key={`${slot.doctorId}-${slot.date}-${slot.startTime}`}
                  onClick={() => onSelect(slot)}
                  aria-pressed={isSelected}
                  aria-label={`${formatTime(slot.startTime)} with ${slot.doctorName}`}
                  className={slotButtonClass(isSelected)}
                >
                  {formatTime(slot.startTime)}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function groupByDate(slots: Slot[]): Record<string, Slot[]> {
  const map: Record<string, Slot[]> = {}
  for (const slot of slots) {
    if (!map[slot.date]) map[slot.date] = []
    map[slot.date]!.push(slot)
  }
  return map
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDateHeader(date: string, todayStr: string, tomorrowStr: string): string {
  if (date === todayStr) return 'Today'
  if (date === tomorrowStr) return 'Tomorrow'
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(y ?? 0, (m ?? 1) - 1, d ?? 1)
  return dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatTime(time: string): string {
  const [hStr, mStr] = time.split(':')
  const h = parseInt(hStr ?? '0', 10)
  const m = parseInt(mStr ?? '0', 10)
  const period = h >= 12 ? 'PM' : 'AM'
  const displayH = h % 12 || 12
  return `${displayH}:${String(m).padStart(2, '0')} ${period}`
}

function slotButtonClass(selected: boolean) {
  return [
    'h-11 rounded-lg border text-[13px] font-medium transition-colors',
    'min-w-[64px] px-1',
    selected
      ? 'border-primary bg-primary/10 text-primary font-semibold'
      : 'border-border bg-card text-foreground hover:bg-muted',
  ].join(' ')
}
