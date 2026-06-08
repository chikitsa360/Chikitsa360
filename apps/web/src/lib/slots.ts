/**
 * Computes the number of appointment slots for a given working hours configuration.
 *
 * @param startTime - Start time string "HH:mm" (e.g. "10:00")
 * @param endTime - End time string "HH:mm" (e.g. "19:00")
 * @param slotDuration - Duration in minutes (15, 20, 30, 60)
 * @param lunchStart - Optional lunch start "HH:mm"
 * @param lunchEnd - Optional lunch end "HH:mm"
 * @returns number of slots, or 0 if invalid times
 */
export function computeSlotCount(
  startTime: string,
  endTime: string,
  slotDuration: number,
  lunchStart?: string,
  lunchEnd?: string,
): number {
  const start = timeToMinutes(startTime)
  const end = timeToMinutes(endTime)

  if (end <= start) return 0

  let totalMinutes = end - start

  if (lunchStart && lunchEnd) {
    const ls = timeToMinutes(lunchStart)
    const le = timeToMinutes(lunchEnd)
    if (le > ls && ls >= start && le <= end) {
      totalMinutes -= le - ls
    }
  }

  if (totalMinutes <= 0 || slotDuration <= 0) return 0
  return Math.floor(totalMinutes / slotDuration)
}

function timeToMinutes(time: string): number {
  const parts = time.split(':').map(Number)
  const h = parts[0] ?? NaN
  const m = parts[1] ?? NaN
  if (isNaN(h) || isNaN(m)) return 0
  return h * 60 + m
}
