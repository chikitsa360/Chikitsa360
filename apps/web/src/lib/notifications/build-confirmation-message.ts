import { formatDayLabel, formatTimeLabel } from '@/lib/whatsapp/slot-availability'
import type { Lang } from '@/lib/whatsapp/templates'
import { t } from '@/lib/whatsapp/templates'

export interface AppointmentDetails {
  patientFirstName: string
  tokenNumber: number
  doctorName: string
  date: string // YYYY-MM-DD
  startTime: string // HH:MM
  clinicName: string
  address: string | null
  language: Lang
}

/**
 * Builds the WhatsApp confirmation message text (bilingual).
 * Called from appointment-confirmation-send Inngest function.
 */
export function buildConfirmationMessage(details: AppointmentDetails): string {
  const {
    patientFirstName,
    tokenNumber,
    doctorName,
    date,
    startTime,
    clinicName,
    address,
    language,
  } = details

  const todayStr = new Date().toISOString().slice(0, 10)
  const dateStr = formatDayLabel(date, todayStr)
  const timeStr = formatTimeLabel(startTime)
  const addr = address ?? ''

  return language === 'hi'
    ? t.confirmationHi(patientFirstName, tokenNumber, doctorName, dateStr, timeStr, clinicName, addr)
    : t.confirmationEn(patientFirstName, tokenNumber, doctorName, dateStr, timeStr, clinicName, addr)
}

/**
 * Builds plain-text SMS fallback content (max 160 chars).
 */
export function buildSmsMessage(details: AppointmentDetails): string {
  const { tokenNumber, doctorName, date, startTime, clinicName, address } = details
  const todayStr = new Date().toISOString().slice(0, 10)
  const dateStr = formatDayLabel(date, todayStr)
  const timeStr = formatTimeLabel(startTime)
  const addr = address ? `. ${address}` : ''

  return `Appointment confirmed. Token #${tokenNumber}. Dr. ${doctorName}. ${dateStr} ${timeStr}. ${clinicName}${addr}.`
    .slice(0, 160)
}
