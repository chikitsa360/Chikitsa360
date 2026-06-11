import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    clinic: { findUnique: vi.fn() },
    $queryRawUnsafe: vi.fn(),
    $executeRawUnsafe: vi.fn(),
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
import { sendSms } from '@/lib/sms/msg91'

const mockDb = db as unknown as {
  clinic: { findUnique: ReturnType<typeof vi.fn> }
  $queryRawUnsafe: ReturnType<typeof vi.fn>
  $executeRawUnsafe: ReturnType<typeof vi.fn>
}
const mockSendSms = sendSms as unknown as ReturnType<typeof vi.fn>

let capturedHandler: (ctx: {
  event: { data: { registrationId: string; clinicId: string } }
  step: {
    run: <T>(id: string, fn: () => Promise<T>) => Promise<T>
    sendEvent: (id: string, payload: unknown) => Promise<void>
  }
}) => Promise<unknown>

;(inngest.createFunction as ReturnType<typeof vi.fn>).mockImplementation(
  (_opts: unknown, _trigger: unknown, handler: typeof capturedHandler) => { capturedHandler = handler }
)

await import('../event-registration-cancelled')

const EVENT_DATA = { registrationId: 'reg-1', clinicId: 'clinic-1' }
const REGISTRATION = { id: 'reg-1', status: 'cancelled', reference_number: 'EVT-001', event_id: 'event-1', patient_id: 'p-1' }
const EVENT_ROW = { id: 'event-1', title: 'Health Camp', slug: 'health-camp', start_time: '2026-07-01 10:00:00', end_time: '2026-07-01 12:00:00', venue: 'Hall', meeting_link: null, fee_paise: null, max_seats: 10, seats_registered: 5 }
const PATIENT = { id: 'p-1', name: 'Ravi Kumar', phone: '9999999999' }
const CLINIC = { name: 'City Clinic', whatsappPhoneNumberId: null }

const makeStep = () => ({
  run: async <T>(_id: string, fn: () => Promise<T>) => fn(),
  sendEvent: vi.fn().mockResolvedValue(undefined),
})

beforeEach(() => {
  vi.resetAllMocks()
  ;(inngest.createFunction as ReturnType<typeof vi.fn>).mockImplementation(() => {})
  mockDb.$executeRawUnsafe.mockResolvedValue(undefined)
})

describe('eventRegistrationCancelled handler', () => {
  it('exits with not_found when registration not found', async () => {
    mockDb.$queryRawUnsafe.mockResolvedValueOnce([]) // registration not found
    mockDb.clinic.findUnique.mockResolvedValue(CLINIC)

    const result = await capturedHandler({ event: { data: EVENT_DATA }, step: makeStep() })
    expect(result).toMatchObject({ reason: 'not_found' })
    expect(mockSendSms).not.toHaveBeenCalled()
  })

  it('sends SMS fallback when clinic has no WA phone', async () => {
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([REGISTRATION])
      .mockResolvedValueOnce([EVENT_ROW])
      .mockResolvedValueOnce([PATIENT])
      .mockResolvedValueOnce([]) // no waitlist entry (seats full check)
    mockDb.clinic.findUnique.mockResolvedValue(CLINIC)

    await capturedHandler({ event: { data: EVENT_DATA }, step: makeStep() })
    expect(mockSendSms).toHaveBeenCalledWith('9999999999', expect.stringContaining('EVT-001'))
  })

  it('auto-promotes first waitlist entry when seat available', async () => {
    const step = makeStep()
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([REGISTRATION])
      .mockResolvedValueOnce([EVENT_ROW])
      .mockResolvedValueOnce([PATIENT])
      // auto-promote: lock event, find waitlist
      .mockResolvedValueOnce([{ ...EVENT_ROW, seats_registered: 4 }]) // seats available
      .mockResolvedValueOnce([{ id: 'wl-1', patient_id: 'p-2', position: 1 }]) // waitlist entry
      .mockResolvedValueOnce([{ cnt: '5' }]) // count for ref number
      .mockResolvedValueOnce([{ id: 'new-reg-1' }]) // insert returning
    mockDb.clinic.findUnique.mockResolvedValue(CLINIC)

    const result = await capturedHandler({ event: { data: EVENT_DATA }, step })
    expect(result).toMatchObject({ promoted: true })
    expect(step.sendEvent).toHaveBeenCalledWith(
      'fire-promoted-confirmation',
      expect.objectContaining({ name: 'event/registration.confirm' })
    )
  })

  it('does not promote when no waitlist entries exist', async () => {
    const step = makeStep()
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([REGISTRATION])
      .mockResolvedValueOnce([EVENT_ROW])
      .mockResolvedValueOnce([PATIENT])
      .mockResolvedValueOnce([{ ...EVENT_ROW, seats_registered: 4 }]) // seats available
      .mockResolvedValueOnce([]) // no waitlist entry
    mockDb.clinic.findUnique.mockResolvedValue(CLINIC)

    const result = await capturedHandler({ event: { data: EVENT_DATA }, step })
    expect(result).toMatchObject({ promoted: false })
    expect(step.sendEvent).not.toHaveBeenCalled()
  })
})
