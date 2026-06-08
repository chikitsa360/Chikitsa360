import { formatDayLabel, formatTimeLabel } from '@/lib/whatsapp/slot-availability'
import type { Lang } from '@/lib/whatsapp/templates'
import { t } from '@/lib/whatsapp/templates'

export interface ReminderDetails {
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
 * Builds the 24h reminder WhatsApp message text (bilingual).
 * Template: apt_reminder_24h — includes Cancel Appointment Quick Reply button.
 */
export function build24hReminderMessage(details: ReminderDetails): string {
  const { patientFirstName, tokenNumber, doctorName, date, startTime, clinicName, address, language } = details
  const todayStr = new Date().toISOString().slice(0, 10)
  const dateStr = formatDayLabel(date, todayStr)
  const timeStr = formatTimeLabel(startTime)
  const addr = address ?? ''

  return language === 'hi'
    ? t.reminder24hHi(patientFirstName, doctorName, dateStr, timeStr, tokenNumber, clinicName, addr)
    : t.reminder24hEn(patientFirstName, doctorName, dateStr, timeStr, tokenNumber, clinicName, addr)
}

/**
 * Builds the 2h reminder WhatsApp message text (bilingual).
 * Template: apt_reminder_2h — text-only, includes "Reply CANCEL to cancel" footer.
 */
export function build2hReminderMessage(details: ReminderDetails): string {
  const { patientFirstName, tokenNumber, doctorName, startTime, clinicName, language } = details
  const timeStr = formatTimeLabel(startTime)

  return language === 'hi'
    ? t.reminder2hHi(patientFirstName, doctorName, timeStr, tokenNumber, clinicName)
    : t.reminder2hEn(patientFirstName, doctorName, timeStr, tokenNumber, clinicName)
}

/**
 * Builds plain-text 24h SMS reminder (max 160 chars).
 */
export function build24hReminderSms(details: ReminderDetails): string {
  const { tokenNumber, doctorName, date, startTime, clinicName } = details
  const todayStr = new Date().toISOString().slice(0, 10)
  const dateStr = formatDayLabel(date, todayStr)
  const timeStr = formatTimeLabel(startTime)
  return `Reminder: Your appt with Dr. ${doctorName} is ${dateStr} at ${timeStr}. Token #${tokenNumber}. ${clinicName}. Reply CANCEL to cancel.`
    .slice(0, 160)
}

/**
 * Builds plain-text 2h SMS reminder (max 160 chars).
 */
export function build2hReminderSms(details: ReminderDetails): string {
  const { tokenNumber, doctorName, startTime, clinicName } = details
  const timeStr = formatTimeLabel(startTime)
  return `Reminder: Your appt with Dr. ${doctorName} is in 2 hours at ${timeStr}. Token #${tokenNumber}. ${clinicName}.`
    .slice(0, 160)
}
