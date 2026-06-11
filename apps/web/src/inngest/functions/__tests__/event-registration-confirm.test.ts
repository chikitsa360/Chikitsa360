import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    clinic: { findUnique: vi.fn() },
    $queryRawUnsafe: vi.fn(),
  },
}))

vi.mock('@/lib/inngest', () => ({
  inngest: {
    createFunction: vi.fn(),
  },
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

// Capture the Inngest handler
let capturedHandler: (ctx: {
  event: { data: { registrationId: string; clinicId: string } }
  step: {
    run: <T>(id: string, fn: () => Promise<T>) => Promise<T>
    sendEvent: (id: string, payload: unknown) => Promise<void>
  }
}) => Promise<unknown>

;(inngest.createFunction as ReturnType<typeof vi.fn>).mockImplementation(
  (_opts: unknown, _trigger: unknown, handler: typeof capturedHandler) => {
    capturedHandler = handler
  }
)

await import('../event-registration-confirm')

// ── Helpers ────────────────────────────────────────────────────────────────
const CLINIC_ID = 'clinic-abc'
const REG_ID = 'reg-123'
const EVENT_DATA = { registrationId: REG_ID, clinicId: CLINIC_ID }

const REGISTRATION = {
  id: REG_ID,
  status: 'registered',
  reference_number: 'EVT-0001',
  cancellation_token: 'token-xyz',
  event_id: 'event-1',
  patient_id: 'patient-1',
}
const EVENT_ROW = {
  id: 'event-1',
  title: 'Health Camp',
  slug: 'health-camp',
  start_time: '2026-07-01 10:00:00',
  end_time: '2026-07-01 12:00:00',
  venue: 'Main Hall',
  meeting_link: null,
  fee_paise: null,
}
const PATIENT = { id: 'patient-1', name: 'Rahul Kumar', phone: '9876543210' }
const CLINIC = { name: 'City Clinic', whatsappPhoneNumberId: 'wa-phone-id' }

// Inline step that just runs the fn immediately
const makeStep = () => ({
  run: async <T>(_id: string, fn: () => Promise<T>) => fn(),
  sendEvent: vi.fn().mockResolvedValue(undefined),
})

beforeEach(() => {
  vi.resetAllMocks()
  ;(inngest.createFunction as ReturnType<typeof vi.fn>).mockImplementation(() => {})
})

describe('eventRegistrationConfirm handler', () => {
  it('exits cleanly when registration not found', async () => {
    mockDb.$queryRawUnsafe.mockResolvedValue([]) // no registration row
    mockDb.clinic.findUnique.mockResolvedValue(CLINIC)

    const result = await capturedHandler({ event: { data: EVENT_DATA }, step: makeStep() })
    expect(result).toMatchObject({ sent: false, reason: 'not_found' })
    expect(mockSendTemplateMessage).not.toHaveBeenCalled()
    expect(mockSendSms).not.toHaveBeenCalled()
  })

  it('exits cleanly when registration status is cancelled', async () => {
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ ...REGISTRATION, status: 'cancelled' }])
      .mockResolvedValueOnce([EVENT_ROW])
      .mockResolvedValueOnce([PATIENT])
    mockDb.clinic.findUnique.mockResolvedValue(CLINIC)

    const result = await capturedHandler({ event: { data: EVENT_DATA }, step: makeStep() })
    expect(result).toMatchObject({ sent: false, reason: 'cancelled' })
    expect(mockSendTemplateMessage).not.toHaveBeenCalled()
  })

  it('exits cleanly when clinic not found', async () => {
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([REGISTRATION])
      .mockResolvedValueOnce([EVENT_ROW])
      .mockResolvedValueOnce([PATIENT])
    mockDb.clinic.findUnique.mockResolvedValue(null)

    const result = await capturedHandler({ event: { data: EVENT_DATA }, step: makeStep() })
    expect(result).toMatchObject({ sent: false, reason: 'not_found' })
    expect(mockSendTemplateMessage).not.toHaveBeenCalled()
  })

  it('sends WA template on success', async () => {
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([REGISTRATION])
      .mockResolvedValueOnce([EVENT_ROW])
      .mockResolvedValueOnce([PATIENT])
    mockDb.clinic.findUnique.mockResolvedValue(CLINIC)
    mockSendTemplateMessage.mockResolvedValue({ success: true, messageId: 'msg-1' })

    const result = await capturedHandler({ event: { data: EVENT_DATA }, step: makeStep() })
    expect(result).toMatchObject({ sent: true })
    expect(mockSendTemplateMessage).toHaveBeenCalledWith(
      'wa-phone-id',
      '9876543210',
      'event_confirmation',
      'en',
      expect.any(Array),
      expect.any(String)
    )
    expect(mockSendSms).not.toHaveBeenCalled()
  })

  it('falls back to SMS when WA send fails', async () => {
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([REGISTRATION])
      .mockResolvedValueOnce([EVENT_ROW])
      .mockResolvedValueOnce([PATIENT])
    mockDb.clinic.findUnique.mockResolvedValue(CLINIC)
    mockSendTemplateMessage.mockResolvedValue({ success: false, error: 'API error' })

    const result = await capturedHandler({ event: { data: EVENT_DATA }, step: makeStep() })
    expect(result).toMatchObject({ sent: true })
    expect(mockSendSms).toHaveBeenCalledWith(
      '9876543210',
      expect.stringContaining('EVT-0001')
    )
  })

  it('falls back to SMS when WA throws', async () => {
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([REGISTRATION])
      .mockResolvedValueOnce([EVENT_ROW])
      .mockResolvedValueOnce([PATIENT])
    mockDb.clinic.findUnique.mockResolvedValue(CLINIC)
    mockSendTemplateMessage.mockRejectedValue(new Error('network'))

    await capturedHandler({ event: { data: EVENT_DATA }, step: makeStep() })
    expect(mockSendSms).toHaveBeenCalled()
  })

  it('falls back to SMS when clinic has no WA phone number', async () => {
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([REGISTRATION])
      .mockResolvedValueOnce([EVENT_ROW])
      .mockResolvedValueOnce([PATIENT])
    mockDb.clinic.findUnique.mockResolvedValue({ ...CLINIC, whatsappPhoneNumberId: null })

    await capturedHandler({ event: { data: EVENT_DATA }, step: makeStep() })
    expect(mockSendTemplateMessage).not.toHaveBeenCalled()
    expect(mockSendSms).toHaveBeenCalled()
  })
})
