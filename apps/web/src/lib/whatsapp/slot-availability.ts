import { computeAvailableSlots } from '@/lib/compute-available-slots'

export interface AvailableSlot {
  id: string
  doctorId: string
  doctorName: string
  date: string // YYYY-MM-DD
  startTime: string // HH:MM
  endTime: string // HH:MM
  dayLabel: string // "Today", "Tomorrow", "Mon, 9 Jun"
  timeLabel: string // "3:30 PM"
}

/** IST offset from UTC in milliseconds (UTC+5:30). */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

/**
 * Returns up to maxSlots available slots from today onward (next 7 days),
 * sorted chronologically. Uses live working_hours + appointments data
 * so changes to doctor schedules are reflected immediately.
 */
export async function getAvailableSlots(
  clinicId: string,
  maxSlots = 5
): Promise<AvailableSlot[]> {
  const nowIST = new Date(Date.now() + IST_OFFSET_MS)
  const todayStr = nowIST.toISOString().slice(0, 10)

  const allSlots = await computeAvailableSlots(
    clinicId,
    new Date(todayStr + 'T00:00:00Z'),
    7
  )

  return allSlots.slice(0, maxSlots).map((s) => ({
    // Encode doctor+date+time as a virtual ID (no physical slots table row)
    id: encodeSlotId(s.doctorId, s.date, s.startTime),
    doctorId: s.doctorId,
    doctorName: s.doctorName,
    date: s.date,
    startTime: s.startTime,
    endTime: s.endTime,
    dayLabel: formatDayLabel(s.date, todayStr),
    timeLabel: formatTimeLabel(s.startTime),
  }))
}

/**
 * Encode a virtual slot ID from doctor, date, and time.
 * Format: "doctorId::date::startTime" (compact, parseable).
 */
export function encodeSlotId(doctorId: string, date: string, startTime: string): string {
  return `${doctorId}::${date}::${startTime}`
}

/**
 * Decode a virtual slot ID back to its components.
 * Returns null if the format is invalid.
 */
export function decodeSlotId(slotId: string): {
  doctorId: string
  date: string
  startTime: string
} | null {
  const parts = slotId.split('::')
  if (parts.length !== 3) return null
  const doctorId = parts[0]
  const date = parts[1]
  const startTime = parts[2]
  if (!doctorId || !date || !startTime) return null
  return { doctorId, date, startTime }
}

export function formatDayLabel(dateStr: string, todayStr: string): string {
  if (dateStr === todayStr) return 'Today'

  // Compute tomorrow using UTC date arithmetic (avoids local timezone offset issues)
  const todayUtc = new Date(todayStr + 'T12:00:00Z')
  todayUtc.setUTCDate(todayUtc.getUTCDate() + 1)
  const tomorrowStr = todayUtc.toISOString().slice(0, 10)

  if (dateStr === tomorrowStr) return 'Tomorrow'

  const date = new Date(dateStr + 'T12:00:00Z')
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}

export function formatTimeLabel(timeStr: string): string {
  const parts = timeStr.split(':')
  const h = parseInt(parts[0] ?? '0', 10)
  const m = parseInt(parts[1] ?? '0', 10)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  const minuteStr = m.toString().padStart(2, '0')
  return `${hour12}:${minuteStr} ${period}`
}
