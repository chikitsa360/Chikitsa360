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

let capturedHandler: (ctx: {
  event: { data: { eventId: string; clinicId: string; changedFields: string[] } }
  step: {
    run: <T>(id: string, fn: () => Promise<T>) => Promise<T>
    sleep: (id: string, duration: string) => Promise<void>
  }
}) => Promise<unknown>

;(inngest.createFunction as ReturnType<typeof vi.fn>).mockImplementation(
  (_opts: unknown, _trigger: unknown, handler: typeof capturedHandler) => { capturedHandler = handler }
)

await import('../event-change-notification')

const EVENT_DATA = { eventId: 'event-1', clinicId: 'clinic-1', changedFields: ['start_time'] }
const EVENT_ROW = { id: 'event-1', title: 'Health Camp', slug: 'health-camp', start_time: '2026-07-01 10:00:00', end_time: '2026-07-01 12:00:00', venue: 'Hall', meeting_link: null }
const CLINIC = { name: 'City Clinic', whatsappPhoneNumberId: 'wa-id' }
const REGISTRANTS = [
  { patient_id: 'p-1', reference_number: 'EVT-001' },
  { patient_id: 'p-2', reference_number: 'EVT-002' },
]
const makeStep = () => ({
  run: async <T>(_id: string, fn: () => Promise<T>) => fn(),
  sleep: vi.fn().mockResolvedValue(undefined),
})

beforeEach(() => {
  vi.resetAllMocks()
  ;(inngest.createFunction as ReturnType<typeof vi.fn>).mockImplementation(() => {})
})

describe('eventChangeNotification handler', () => {
  it('exits with no_registrants when no confirmed registrations exist', async () => {
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([EVENT_ROW])  // load-event
      .mockResolvedValueOnce([])           // load-registrants (empty)
    mockDb.clinic.findUnique.mockResolvedValue(CLINIC)

    const result = await capturedHandler({ event: { data: EVENT_DATA }, step: makeStep() })
    expect(result).toMatchObject({ sent: 0, reason: 'no_registrants' })
    expect(mockSendTemplateMessage).not.toHaveBeenCalled()
  })

  it('sends WA to each registrant in batch', async () => {
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([EVENT_ROW])
      .mockResolvedValueOnce(REGISTRANTS)
      .mockResolvedValueOnce([{ phone: '9111111111', name: 'Amit' }])  // patient p-1
      .mockResolvedValueOnce([{ phone: '9222222222', name: 'Priya' }]) // patient p-2
    mockDb.clinic.findUnique.mockResolvedValue(CLINIC)
    mockSendTemplateMessage.mockResolvedValue({ success: true, messageId: 'msg-1' })

    const result = await capturedHandler({ event: { data: EVENT_DATA }, step: makeStep() })
    expect(result).toMatchObject({ sent: 2, total: 2 })
    expect(mockSendTemplateMessage).toHaveBeenCalledTimes(2)
  })

  it('falls back to SMS when WA send fails for a registrant', async () => {
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([EVENT_ROW])
      .mockResolvedValueOnce([REGISTRANTS[0]])
      .mockResolvedValueOnce([{ phone: '9111111111', name: 'Amit' }])
    mockDb.clinic.findUnique.mockResolvedValue(CLINIC)
    mockSendTemplateMessage.mockResolvedValue({ success: false })

    await capturedHandler({ event: { data: EVENT_DATA }, step: makeStep() })
    expect(mockSendSms).toHaveBeenCalledWith('9111111111', expect.stringContaining('EVT-001'))
  })
})
