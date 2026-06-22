/**
 * Computes available booking slots for a clinic/doctor/date range.
 * Reads working_hours config + existing appointments to return only free slots.
 * Used by the public slot availability API (Story 4.1 / FR-8).
 */
import { db } from '@/lib/db'

export interface AvailableSlot {
  doctorId: string
  doctorName: string
  date: string // YYYY-MM-DD
  startTime: string // HH:mm
  endTime: string // HH:mm
}

interface WorkingHoursRow {
  doctor_id: string
  day_of_week: number
  start_time: string
  end_time: string
  slot_duration: number
  lunch_start_time: string | null
  lunch_end_time: string | null
  is_active: boolean
}

interface DoctorRow {
  id: string
  name: string
}

interface AppointmentRow {
  doctor_id: string
  appointment_date: string
  appointment_time: string
}

interface SlotBlockRow {
  doctor_id: string | null // null = all doctors
  block_date: string
  start_time: string
  end_time: string
  recurrence: string
}

/**
 * Returns the day-of-week (0=Sun,1=Mon,...,6=Sat) for a YYYY-MM-DD date string.
 * Uses UTC to avoid timezone drift.
 */
export function getDayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1))
  return date.getUTCDay()
}

/**
 * Generate all time slot start times for a working hours config on a single day.
 * Returns array of { startTime: "HH:mm", endTime: "HH:mm" }.
 */
export function generateSlotTimes(
  startTime: string,
  endTime: string,
  slotDuration: number,
  lunchStart?: string | null,
  lunchEnd?: string | null
): { startTime: string; endTime: string }[] {
  const slots: { startTime: string; endTime: string }[] = []

  const startMins = timeToMinutes(startTime)
  const endMins = timeToMinutes(endTime)
  const lunchStartMins = lunchStart ? timeToMinutes(lunchStart) : null
  const lunchEndMins = lunchEnd ? timeToMinutes(lunchEnd) : null

  if (endMins <= startMins || slotDuration <= 0) return slots

  let current = startMins
  while (current + slotDuration <= endMins) {
    const slotEnd = current + slotDuration

    // Skip if this slot overlaps with lunch
    if (
      lunchStartMins !== null &&
      lunchEndMins !== null &&
      lunchEndMins > lunchStartMins
    ) {
      const overlapsLunch = current < lunchEndMins && slotEnd > lunchStartMins
      if (overlapsLunch) {
        // Jump to after lunch
        current = lunchEndMins
        continue
      }
    }

    slots.push({
      startTime: minutesToTime(current),
      endTime: minutesToTime(slotEnd),
    })
    current += slotDuration
  }

  return slots
}

function timeToMinutes(time: string): number {
  // Postgres TIME comes back as "HH:mm:ss" or "HH:mm"
  const parts = time.split(':').map(Number)
  const h = parts[0] ?? NaN
  const m = parts[1] ?? NaN
  if (isNaN(h) || isNaN(m)) return 0
  return h * 60 + m
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Returns true if the slot has already started (or passed) relative to the
 * current IST time on today's date. Pure function — safe to unit-test.
 *
 * @param date         - YYYY-MM-DD date of the slot
 * @param slotStart    - HH:mm start time of the slot
 * @param todayIST     - YYYY-MM-DD representing today in IST
 * @param nowTimeIST   - HH:mm representing the current IST time
 */
export function isPastSlot(
  date: string,
  slotStart: string,
  todayIST: string,
  nowTimeIST: string
): boolean {
  // Only filter on today; future dates are always valid
  if (date !== todayIST) return false
  // Hide slot if its start time is strictly before now (current-minute slot still shows)
  return slotStart < nowTimeIST
}

/** IST offset from UTC in milliseconds (UTC+5:30). */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

/** Returns the current date-time shifted to IST. */
function getNowIST(): Date {
  return new Date(Date.now() + IST_OFFSET_MS)
}

/**
 * Compute available slots for a clinic, optionally filtered by doctor,
 * over the next `days` days from `fromDate`.
 */
export async function computeAvailableSlots(
  clinicId: string,
  fromDate: Date,
  days: number,
  doctorId?: string
): Promise<AvailableSlot[]> {
  const schemaName = `clinic_${clinicId}`

  // Compute current IST time for past-slot filtering
  const nowIST = getNowIST()
  const todayIST = nowIST.toISOString().split('T')[0]!
  const nowHour = nowIST.getUTCHours()
  const nowMin = nowIST.getUTCMinutes()
  const currentTimeIST = `${String(nowHour).padStart(2, '0')}:${String(nowMin).padStart(2, '0')}`

  // Build list of dates (YYYY-MM-DD)
  const dates: string[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date(fromDate)
    d.setUTCDate(d.getUTCDate() + i)
    dates.push(d.toISOString().split('T')[0] as string)
  }

  // Fetch doctors
  const doctors = await db.$queryRawUnsafe<DoctorRow[]>(
    doctorId
      ? `SELECT id, name FROM "${schemaName}".doctors WHERE id = $1::uuid`
      : `SELECT id, name FROM "${schemaName}".doctors ORDER BY name ASC`,
    ...(doctorId ? [doctorId] : [])
  )

  if (doctors.length === 0) return []

  // Fetch working hours for these doctors
  const doctorIds = doctors.map((d) => d.id)
  const whRows = await db.$queryRawUnsafe<WorkingHoursRow[]>(
    `SELECT doctor_id, day_of_week, start_time::text, end_time::text, slot_duration,
            lunch_start_time::text, lunch_end_time::text, is_active
     FROM "${schemaName}".working_hours
     WHERE doctor_id = ANY($1::uuid[]) AND is_active = true`,
    doctorIds
  )

  // Build working hours map: doctorId -> dayOfWeek -> config
  const whMap = new Map<string, Map<number, WorkingHoursRow>>()
  for (const wh of whRows) {
    if (!whMap.has(wh.doctor_id)) whMap.set(wh.doctor_id, new Map())
    whMap.get(wh.doctor_id)!.set(wh.day_of_week, wh)
  }

  // Fetch existing non-cancelled appointments in the date range
  const firstDate = dates[0]!
  const lastDate = dates[dates.length - 1]!
  const bookedRows = await db.$queryRawUnsafe<AppointmentRow[]>(
    `SELECT doctor_id, appointment_date::text, appointment_time::text
     FROM "${schemaName}".appointments
     WHERE appointment_date >= $1::date
       AND appointment_date <= $2::date
       AND appointment_time IS NOT NULL
       AND status != 'cancelled'`,
    firstDate,
    lastDate
  )

  // Build booked set: "doctorId|date|startTime"
  const bookedSet = new Set<string>()
  for (const row of bookedRows) {
    // appointment_time comes back as "HH:mm:ss" — normalize to "HH:mm"
    const time = row.appointment_time.slice(0, 5)
    bookedSet.add(`${row.doctor_id}|${row.appointment_date}|${time}`)
  }

  // Fetch slot blocks that may apply to this date range
  let blockRows: SlotBlockRow[] = []
  try {
    blockRows = await db.$queryRawUnsafe<SlotBlockRow[]>(
      `SELECT doctor_id, block_date::text, start_time::text, end_time::text, recurrence
       FROM "${schemaName}".slot_blocks
       WHERE recurrence != 'none'
          OR (block_date >= $1::date AND block_date <= $2::date)`,
      firstDate,
      lastDate
    )
  } catch {
    // Table may not exist yet in older schemas — fail gracefully
  }

  // Compute available slots
  const result: AvailableSlot[] = []

  for (const doctor of doctors) {
    const doctorWh = whMap.get(doctor.id)
    if (!doctorWh) continue

    for (const date of dates) {
      const dayOfWeek = getDayOfWeek(date)
      const wh = doctorWh.get(dayOfWeek)
      if (!wh) continue

      const slotTimes = generateSlotTimes(
        wh.start_time,
        wh.end_time,
        wh.slot_duration,
        wh.lunch_start_time,
        wh.lunch_end_time
      )

      for (const slot of slotTimes) {
        // Skip slots that have already passed (IST-aware)
        if (isPastSlot(date, slot.startTime, todayIST, currentTimeIST)) continue

        const key = `${doctor.id}|${date}|${slot.startTime}`
        if (bookedSet.has(key)) continue

        // Check slot blocks
        if (isSlotBlocked(blockRows, doctor.id, date, slot.startTime, slot.endTime)) continue

        result.push({
          doctorId: doctor.id,
          doctorName: doctor.name,
          date,
          startTime: slot.startTime,
          endTime: slot.endTime,
        })
      }
    }
  }

  return result
}

/**
 * Returns true if the given slot (doctorId, date, startTime–endTime) is covered by any block.
 */
function isSlotBlocked(
  blocks: SlotBlockRow[],
  doctorId: string,
  date: string,
  startTime: string,
  endTime: string
): boolean {
  const dayOfWeek = getDayOfWeek(date)
  for (const block of blocks) {
    // Check if this block applies to this doctor (null = all doctors)
    if (block.doctor_id !== null && block.doctor_id !== doctorId) continue

    // Check if this block applies to this date
    const applies =
      (block.recurrence === 'none' && block.block_date === date) ||
      block.recurrence === 'daily' ||
      (block.recurrence === 'weekly' && getDayOfWeek(block.block_date) === dayOfWeek)

    if (!applies) continue

    // Check time overlap: block covers slot if block.start < slot.end AND block.end > slot.start
    const blockStart = block.start_time.slice(0, 5)
    const blockEnd = block.end_time.slice(0, 5)
    if (blockStart < endTime && blockEnd > startTime) return true
  }
  return false
}
