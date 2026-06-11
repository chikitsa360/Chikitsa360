import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    $queryRawUnsafe: vi.fn(),
    $executeRawUnsafe: vi.fn(),
  },
}))

vi.mock('@/lib/inngest', () => ({
  inngest: { send: vi.fn().mockResolvedValue(undefined) },
}))

import { POST } from '../route'
import { db } from '@/lib/db'
import { inngest } from '@/lib/inngest'
import { NextRequest } from 'next/server'

const mockDb = db as unknown as {
  $queryRawUnsafe: ReturnType<typeof vi.fn>
  $executeRawUnsafe: ReturnType<typeof vi.fn>
}
const mockInngest = inngest as unknown as { send: ReturnType<typeof vi.fn> }

const SLUG = 'health-camp'
const TOKEN = '11111111-2222-3333-4444-555555555555'
const CLINIC_ID = 'clinic-abc'
const REG_ID = 'reg-xyz'
const FUTURE = new Date(Date.now() + 86400000).toISOString()

function makeReq(body: unknown) {
  return new NextRequest(`http://localhost/api/v1/events/${SLUG}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}
const makeParams = () => Promise.resolve({ eventId: SLUG })

beforeEach(() => {
  vi.resetAllMocks()
  mockDb.$executeRawUnsafe.mockResolvedValue(undefined)
})

describe('POST /api/v1/events/[eventId]/cancel', () => {
  it('cancels registration and fires Inngest on valid token', async () => {
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ clinic_id: CLINIC_ID }])
      .mockResolvedValueOnce([{ id: REG_ID, status: 'registered', event_id: 'event-1', cancellation_token: TOKEN }])
      .mockResolvedValueOnce([{ id: 'event-1', start_time: FUTURE }])

    const res = await POST(makeReq({ token: TOKEN }), { params: makeParams() })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.status).toBe('cancelled')
    expect(mockDb.$executeRawUnsafe).toHaveBeenCalledWith(expect.stringContaining("status = 'cancelled'"), REG_ID)
    expect(mockDb.$executeRawUnsafe).toHaveBeenCalledWith(expect.stringContaining('GREATEST(0, seats_registered - 1)'), 'event-1')
    expect(mockInngest.send).toHaveBeenCalledWith(expect.objectContaining({ name: 'event/registration.cancelled' }))
  })

  it('returns 422 EVENT_STARTED when event start_time is in the past', async () => {
    const past = new Date(Date.now() - 86400000).toISOString()
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ clinic_id: CLINIC_ID }])
      .mockResolvedValueOnce([{ id: REG_ID, status: 'registered', event_id: 'event-1', cancellation_token: TOKEN }])
      .mockResolvedValueOnce([{ id: 'event-1', start_time: past }])

    const res = await POST(makeReq({ token: TOKEN }), { params: makeParams() })
    const json = await res.json()

    expect(res.status).toBe(422)
    expect(json.error.code).toBe('EVENT_STARTED')
    expect(mockInngest.send).not.toHaveBeenCalled()
  })

  it('returns 422 INVALID_TOKEN when token not found', async () => {
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ clinic_id: CLINIC_ID }])
      .mockResolvedValueOnce([])

    const res = await POST(makeReq({ token: TOKEN }), { params: makeParams() })
    const json = await res.json()

    expect(res.status).toBe(422)
    expect(json.error.code).toBe('INVALID_TOKEN')
  })

  it('returns 422 ALREADY_CANCELLED when registration already cancelled', async () => {
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ clinic_id: CLINIC_ID }])
      .mockResolvedValueOnce([{ id: REG_ID, status: 'cancelled', event_id: 'event-1', cancellation_token: TOKEN }])

    const res = await POST(makeReq({ token: TOKEN }), { params: makeParams() })
    const json = await res.json()

    expect(res.status).toBe(422)
    expect(json.error.code).toBe('ALREADY_CANCELLED')
  })
})
