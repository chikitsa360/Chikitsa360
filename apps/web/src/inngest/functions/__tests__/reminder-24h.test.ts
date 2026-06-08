import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    clinic: { findUnique: vi.fn() },
    $queryRawUnsafe: vi.fn(),
    $executeRawUnsafe: vi.fn(),
  },
}))

vi.mock('@/lib/inngest', () => ({
  inngest: {
    createFunction: vi.fn(),
    send: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('@/lib/whatsapp/message-sender', () => ({
  sendQuickReply: vi.fn(),
}))

vi.mock('@/lib/notifications/build-reminder-message', () => ({
  build24hReminderMessage: vi.fn().mockReturnValue('reminder message'),
}))

import { db } from '@/lib/db'
import { inngest } from '@/lib/inngest'
import { sendQuickReply } from '@/lib/whatsapp/message-sender'

const mockDb = db as unknown as {
  clinic: { findUnique: ReturnType<typeof vi.fn> }
  $queryRawUnsafe: ReturnType<typeof vi.fn>
  $executeRawUnsafe: ReturnType<typeof vi.fn>
}
const mockInngest = inngest as unknown as { send: ReturnType<typeof vi.fn> }
const mockSendQuickReply = sendQuickReply as unknown as ReturnType<typeof vi.fn>

// Extract the handler from the Inngest function definition
let capturedHandler: (ctx: { event: { data: { appointmentId: string; clinicId: string } } }) => Promise<unknown>
;(inngest.createFunction as ReturnType<typeof vi.fn>).mockImplementation(
  (_opts: unknown, _trigger: unknown, handler: typeof capturedHandler) => {
    capturedHandler = handler
  }
)

// Import the module to trigger createFunction call
await import('../appointment-reminder-24h')

const EVENT_DATA = { appointmentId: 'apt-1', clinicId: 'clinic-1' }
const CLINIC = {
  name: 'City Clinic',
  address: '12 Main St',
  language: 'en',
  whatsappPhoneNumberId: 'wa-phone-id',
  reminder24hEnabled: true,
}
const APT = {
  status: 'confirmed',
  token_number: 5,
  appointment_date: '2026-06-10',
  is_sample: false,
  patient_id: 'patient-1',
  doctor_id: 'doctor-1',
  slot_id: 'slot-1',
}
const PATIENT = { name: 'Rahul', phone: '9876543210', whatsapp_opt_out_at: null }
const DOCTOR = { name: 'Dr. Sharma' }
const SLOT = { start_time: '15:30' }

beforeEach(() => {
  vi.resetAllMocks()
  ;(inngest.createFunction as ReturnType<typeof vi.fn>).mockImplementation(() => {})
})

describe('appointmentReminder24h handler', () => {
  it('exits with toggle_disabled when clinic reminder is off', async () => {
    mockDb.clinic.findUnique.mockResolvedValue({ ...CLINIC, reminder24hEnabled: false })
    mockDb.$queryRawUnsafe.mockResolvedValue([APT])

    const result = await capturedHandler({ event: { data: EVENT_DATA } })
    expect(result).toMatchObject({ sent: false, reason: 'toggle_disabled' })
    expect(mockSendQuickReply).not.toHaveBeenCalled()
  })

  it('exits with not_confirmed if appointment status != confirmed', async () => {
    mockDb.clinic.findUnique.mockResolvedValue(CLINIC)
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ ...APT, status: 'cancelled' }])

    const result = await capturedHandler({ event: { data: EVENT_DATA } })
    expect(result).toMatchObject({ sent: false, reason: 'not_confirmed' })
  })

  it('skips WA and enqueues SMS when patient opted out', async () => {
    mockDb.clinic.findUnique.mockResolvedValue(CLINIC)
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([APT])
      .mockResolvedValueOnce([{ ...PATIENT, whatsapp_opt_out_at: '2026-01-01T00:00:00' }])
    mockDb.$executeRawUnsafe.mockResolvedValue(undefined)

    const result = await capturedHandler({ event: { data: EVENT_DATA } })
    expect(result).toMatchObject({ sent: false, reason: 'patient_opted_out', smsFallbackScheduled: true })
    expect(mockInngest.send).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'appointment/sms-fallback.send', data: expect.objectContaining({ channel: 'reminder-24h' }) })
    )
    expect(mockSendQuickReply).not.toHaveBeenCalled()
  })

  it('sends WA and updates reminder_24h_sent_at on success', async () => {
    mockDb.clinic.findUnique.mockResolvedValue(CLINIC)
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([APT])
      .mockResolvedValueOnce([PATIENT])
      .mockResolvedValueOnce([DOCTOR])
      .mockResolvedValueOnce([SLOT])
    mockDb.$executeRawUnsafe.mockResolvedValue(undefined)
    mockSendQuickReply.mockResolvedValue({ success: true, messageId: 'msg-1' })

    const result = await capturedHandler({ event: { data: EVENT_DATA } })
    expect(result).toMatchObject({ sent: true })
    expect(mockDb.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('reminder_24h_sent_at'),
      'apt-1'
    )
  })

  it('enqueues SMS fallback on WA send failure', async () => {
    mockDb.clinic.findUnique.mockResolvedValue(CLINIC)
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([APT])
      .mockResolvedValueOnce([PATIENT])
      .mockResolvedValueOnce([DOCTOR])
      .mockResolvedValueOnce([SLOT])
    mockDb.$executeRawUnsafe.mockResolvedValue(undefined)
    mockSendQuickReply.mockResolvedValue({ success: false, error: 'API error' })

    await capturedHandler({ event: { data: EVENT_DATA } })
    expect(mockInngest.send).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'appointment/sms-fallback.send', data: expect.objectContaining({ channel: 'reminder-24h' }) })
    )
  })

  it('exits with sample_appointment for is_sample=true', async () => {
    mockDb.clinic.findUnique.mockResolvedValue(CLINIC)
    mockDb.$queryRawUnsafe.mockResolvedValueOnce([{ ...APT, is_sample: true }])

    const result = await capturedHandler({ event: { data: EVENT_DATA } })
    expect(result).toMatchObject({ sent: false, reason: 'sample_appointment' })
  })
})
