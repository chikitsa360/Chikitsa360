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
  event: { data: { eventId: string; clinicId: string } }
  step: {
    run: <T>(id: string, fn: () => Promise<T>) => Promise<T>
    sleep: (id: string, duration: string) => Promise<void>
  }
}) => Promise<unknown>

;(inngest.createFunction as ReturnType<typeof vi.fn>).mockImplementation(
  (_opts: unknown, _trigger: unknown, handler: typeof capturedHandler) => { capturedHandler = handler }
)

await import('../event-cancel-notification')

const EVENT_DATA = { eventId: 'event-1', clinicId: 'clinic-1' }
const EVENT_ROW = { title: 'Health Camp', start_time: '2026-07-01 10:00:00' }
const CLINIC = { name: 'City Clinic', whatsappPhoneNumberId: 'wa-id' }
const makeStep = () => ({
  run: async <T>(_id: string, fn: () => Promise<T>) => fn(),
  sleep: vi.fn().mockResolvedValue(undefined),
})

beforeEach(() => {
  vi.resetAllMocks()
  ;(inngest.createFunction as ReturnType<typeof vi.fn>).mockImplementation(() => {})
})

describe('eventCancelNotification handler', () => {
  it('exits with no_recipients when both lists are empty', async () => {
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([EVENT_ROW]) // load-event
      .mockResolvedValueOnce([])          // registrants
      .mockResolvedValueOnce([])          // waitlisted
    mockDb.clinic.findUnique.mockResolvedValue(CLINIC)

    const result = await capturedHandler({ event: { data: EVENT_DATA }, step: makeStep() })
    expect(result).toMatchObject({ sent: 0, reason: 'no_recipients' })
    expect(mockSendTemplateMessage).not.toHaveBeenCalled()
  })

  it('deduplicates patient_ids across registrants and waitlist', async () => {
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([EVENT_ROW])
      .mockResolvedValueOnce([{ patient_id: 'p-1' }, { patient_id: 'p-2' }])  // registrants
      .mockResolvedValueOnce([{ patient_id: 'p-1' }, { patient_id: 'p-3' }])  // waitlisted (p-1 duplicate)
      .mockResolvedValueOnce([{ phone: '9111111111', name: 'Amit' }])   // p-1
      .mockResolvedValueOnce([{ phone: '9222222222', name: 'Priya' }])  // p-2
      .mockResolvedValueOnce([{ phone: '9333333333', name: 'Ravi' }])   // p-3
    mockDb.clinic.findUnique.mockResolvedValue(CLINIC)
    mockSendTemplateMessage.mockResolvedValue({ success: true, messageId: 'msg-1' })

    const result = await capturedHandler({ event: { data: EVENT_DATA }, step: makeStep() })
    // 3 unique patients (p-1 deduplicated)
    expect(result).toMatchObject({ sent: 3, total: 3 })
    expect(mockSendTemplateMessage).toHaveBeenCalledTimes(3)
  })

  it('falls back to SMS when WA fails', async () => {
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([EVENT_ROW])
      .mockResolvedValueOnce([{ patient_id: 'p-1' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ phone: '9111111111', name: 'Amit' }])
    mockDb.clinic.findUnique.mockResolvedValue(CLINIC)
    mockSendTemplateMessage.mockResolvedValue({ success: false })

    await capturedHandler({ event: { data: EVENT_DATA }, step: makeStep() })
    expect(mockSendSms).toHaveBeenCalledWith('9111111111', expect.stringContaining('Health Camp'))
  })
})
