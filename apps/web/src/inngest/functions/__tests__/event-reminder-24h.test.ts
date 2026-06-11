import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    clinic: { findUnique: vi.fn() },
    $queryRawUnsafe: vi.fn(),
  },
}))

vi.mock('@/lib/inngest', () => ({
  inngest: { createFunction: vi.fn() },
}))

vi.mock('@/lib/meta-whatsapp', () => ({
  sendTemplateMessage: vi.fn(),
}))

vi.mock('@/lib/sms/msg91', () => ({
  sendSms: vi.fn().mockResolvedValue(undefined),
}))

import { db } from '@/lib/db'
import { inngest } from '@/lib/inngest'
import { sendTemplateMessage } from '@/lib/meta-whatsapp'
import { sendSms } from '@/lib/sms/msg91'

const mockDb = db as unknown as {
  clinic: { findUnique: ReturnType<typeof vi.fn> }
  $queryRawUnsafe: ReturnType<typeof vi.fn>
}
const mockSendTemplateMessage = sendTemplateMessage as unknown as ReturnType<typeof vi.fn>
const mockSendSms = sendSms as unknown as ReturnType<typeof vi.fn>

let capturedHandler: (ctx: { event: { data: { registrationId: string; clinicId: string } } }) => Promise<unknown>
;(inngest.createFunction as ReturnType<typeof vi.fn>).mockImplementation(
  (_opts: unknown, _trigger: unknown, handler: typeof capturedHandler) => { capturedHandler = handler }
)

await import('../event-reminder-24h')

const EVENT_DATA = { registrationId: 'reg-1', clinicId: 'clinic-1' }
const CLINIC = { name: 'City Clinic', whatsappPhoneNumberId: 'wa-id', eventReminder24hEnabled: true }
const REGISTRATION = { status: 'registered', reference_number: 'EVT-001', patient_id: 'p-1', event_id: 'e-1' }
const EVENT_ROW = { title: 'Health Camp', start_time: '2026-07-01 10:00:00', end_time: '2026-07-01 12:00:00', venue: 'Hall', meeting_link: null }
const PATIENT = { name: 'Ravi Kumar', phone: '9999999999', whatsapp_opt_out_at: null }

beforeEach(() => {
  vi.resetAllMocks()
  ;(inngest.createFunction as ReturnType<typeof vi.fn>).mockImplementation(() => {})
})

describe('eventReminder24h handler', () => {
  it('exits with toggle_disabled when clinic event reminder is off', async () => {
    mockDb.clinic.findUnique.mockResolvedValue({ ...CLINIC, eventReminder24hEnabled: false })
    const result = await capturedHandler({ event: { data: EVENT_DATA } })
    expect(result).toMatchObject({ sent: false, reason: 'toggle_disabled' })
    expect(mockSendTemplateMessage).not.toHaveBeenCalled()
  })

  it('exits with not_registered when registration status is cancelled', async () => {
    mockDb.clinic.findUnique.mockResolvedValue(CLINIC)
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ ...REGISTRATION, status: 'cancelled' }])
    const result = await capturedHandler({ event: { data: EVENT_DATA } })
    expect(result).toMatchObject({ sent: false, reason: 'not_registered' })
    expect(mockSendTemplateMessage).not.toHaveBeenCalled()
  })

  it('exits with not_registered when status is attended', async () => {
    mockDb.clinic.findUnique.mockResolvedValue(CLINIC)
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ ...REGISTRATION, status: 'attended' }])
    const result = await capturedHandler({ event: { data: EVENT_DATA } })
    expect(result).toMatchObject({ sent: false, reason: 'not_registered' })
  })

  it('sends SMS fallback when patient has opted out of WhatsApp', async () => {
    mockDb.clinic.findUnique.mockResolvedValue(CLINIC)
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([REGISTRATION])
      .mockResolvedValueOnce([EVENT_ROW])
      .mockResolvedValueOnce([{ ...PATIENT, whatsapp_opt_out_at: '2026-01-01T00:00:00' }])
    const result = await capturedHandler({ event: { data: EVENT_DATA } })
    expect(result).toMatchObject({ sent: false, reason: 'patient_opted_out', smsFallback: true })
    expect(mockSendTemplateMessage).not.toHaveBeenCalled()
    expect(mockSendSms).toHaveBeenCalledWith('9999999999', expect.stringContaining('EVT-001'))
  })

  it('sends WA reminder when all checks pass', async () => {
    mockDb.clinic.findUnique.mockResolvedValue(CLINIC)
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([REGISTRATION])
      .mockResolvedValueOnce([EVENT_ROW])
      .mockResolvedValueOnce([PATIENT])
    mockSendTemplateMessage.mockResolvedValue({ success: true, messageId: 'msg-1' })
    const result = await capturedHandler({ event: { data: EVENT_DATA } })
    expect(result).toMatchObject({ sent: true })
    expect(mockSendTemplateMessage).toHaveBeenCalledWith('wa-id', '9999999999', 'event_reminder_24h', 'en', expect.any(Array), expect.any(String))
    expect(mockSendSms).not.toHaveBeenCalled()
  })
})
