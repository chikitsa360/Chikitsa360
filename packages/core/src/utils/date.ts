const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000 // UTC+5:30

/**
 * Convert a UTC date to IST (UTC+5:30).
 * Returns a new Date object representing IST time.
 */
export function toIST(date: Date | string | number): Date {
  const d = new Date(date)
  return new Date(d.getTime() + IST_OFFSET_MS)
}

/**
 * Format a date/time value in IST (UTC+5:30) for display.
 * All portal times are shown in IST per NFR-14.
 */
export function formatIST(
  date: Date | string | number,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }
): string {
  const d = new Date(date)
  return new Intl.DateTimeFormat('en-IN', {
    ...options,
    timeZone: 'Asia/Kolkata',
  }).format(d)
}

/**
 * Format only the date portion in IST.
 */
export function formatISTDate(date: Date | string | number): string {
  return formatIST(date, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Kolkata',
  })
}

/**
 * Format only the time portion in IST.
 */
export function formatISTTime(date: Date | string | number): string {
  return formatIST(date, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  })
}

/**
 * Parse an IST date string to UTC Date.
 * Assumes the input is in IST and converts to UTC.
 */
export function parseIST(dateString: string): Date {
  const d = new Date(dateString)
  return new Date(d.getTime() - IST_OFFSET_MS)
}

/**
 * Get the current date in IST as YYYY-MM-DD string.
 */
export function getTodayIST(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}
