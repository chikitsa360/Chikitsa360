import { db } from '@/lib/db'

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

/**
 * Returns up to maxSlots available slots from today onward (next 7 days),
 * sorted chronologically. Uses existing slot rows in the tenant DB.
 */
export async function getAvailableSlots(
  clinicId: string,
  maxSlots = 5
): Promise<AvailableSlot[]> {
  const schemaName = `clinic_${clinicId}`

  // IST offset: UTC+5:30
  const nowUtc = Date.now()
  const istOffsetMs = 5.5 * 60 * 60 * 1000
  const istNow = new Date(nowUtc + istOffsetMs)
  const todayStr = istNow.toISOString().slice(0, 10)
  const nowTimeStr = istNow.toISOString().slice(11, 16) // HH:MM in IST

  const rows = await db.$queryRawUnsafe<
    {
      id: string
      doctor_id: string
      doctor_name: string
      date: string
      start_time: string
      end_time: string
    }[]
  >(
    `SELECT s.id, s.doctor_id, d.name AS doctor_name,
            s.date::text AS date, s.start_time::text AS start_time, s.end_time::text AS end_time
     FROM "${schemaName}".slots s
     JOIN "${schemaName}".doctors d ON d.id = s.doctor_id
     WHERE s.status = 'available'
       AND (
         s.date > $1::date
         OR (s.date = $1::date AND s.start_time > $2::time)
       )
       AND s.date <= ($1::date + interval '7 days')
     ORDER BY s.date ASC, s.start_time ASC
     LIMIT $3`,
    todayStr,
    nowTimeStr,
    maxSlots
  )

  return rows.map((r) => ({
    id: r.id,
    doctorId: r.doctor_id,
    doctorName: r.doctor_name,
    date: r.date,
    startTime: r.start_time,
    endTime: r.end_time,
    dayLabel: formatDayLabel(r.date, todayStr),
    timeLabel: formatTimeLabel(r.start_time),
  }))
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
