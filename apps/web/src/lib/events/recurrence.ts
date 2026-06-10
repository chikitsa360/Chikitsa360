/**
 * Generates event dates for a recurring event series.
 * Each occurrence is a { startTime, endTime } pair.
 */

export type RecurrenceType = 'daily' | 'weekly'

export interface RecurrenceDate {
  startTime: Date
  endTime: Date
}

export interface GenerateRecurrenceDatesOptions {
  baseStartTime: Date
  baseEndTime: Date
  type: RecurrenceType
  dayOfWeek?: number // 0=Sun … 6=Sat — required for weekly
  occurrences: number
}

/**
 * For weekly recurrence, verifies the base date's day-of-week matches the requested dayOfWeek.
 * Returns an error message or null if valid.
 */
export function validateWeeklyDayOfWeek(baseDate: Date, dayOfWeek: number): string | null {
  const actual = baseDate.getUTCDay()
  if (actual !== dayOfWeek) {
    const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return `Base date is a ${DAY_NAMES[actual]}, but recurrence dayOfWeek is ${DAY_NAMES[dayOfWeek]}. They must match.`
  }
  return null
}

/**
 * Generates N recurrence dates starting from the base date.
 * Daily: i * 1 day offset. Weekly: i * 7 days offset.
 */
export function generateRecurrenceDates(opts: GenerateRecurrenceDatesOptions): RecurrenceDate[] {
  const { baseStartTime, baseEndTime, type, dayOfWeek, occurrences } = opts

  if (type === 'weekly' && dayOfWeek !== undefined) {
    const err = validateWeeklyDayOfWeek(baseStartTime, dayOfWeek)
    if (err) throw new Error(err)
  }

  const durationMs = baseEndTime.getTime() - baseStartTime.getTime()
  const results: RecurrenceDate[] = []

  for (let i = 0; i < occurrences; i++) {
    const offsetDays = type === 'daily' ? i : i * 7
    const startTime = new Date(baseStartTime)
    startTime.setUTCDate(startTime.getUTCDate() + offsetDays)
    const endTime = new Date(startTime.getTime() + durationMs)
    results.push({ startTime, endTime })
  }

  return results
}
