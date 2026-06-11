import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/db', () => ({
  db: {
    $queryRawUnsafe: vi.fn(),
    $executeRawUnsafe: vi.fn(),
  },
}))
vi.mock('@/lib/inngest', () => ({ inngest: { send: vi.fn().mockResolvedValue(undefined) } }))
vi.mock('@/lib/audit', () => ({ writeAuditLog: vi.fn().mockResolvedValue(undefined) }))

import { PATCH } from '../route'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { inngest } from '@/lib/inngest'
import { NextRequest } from 'next/server'

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>
const mockDb = db as unknown as {
  $queryRawUnsafe: ReturnType<typeof vi.fn>
  $executeRawUnsafe: ReturnType<typeof vi.fn>
}
const mockInngest = inngest as unknown as { send: ReturnType<typeof vi.fn> }

const SESSION = { user: { clinicId: 'clinic-1', id: 'user-1' } }
const PAST = new Date(Date.now() - 7200000).toISOString()   // 2h ago
const FUTURE = new Date(Date.now() + 86400000).toISOString() // tomorrow
const EVENT = { id: 'event-1', clinic_id: 'clinic-1', start_time: PAST }
const REG = { id: 'reg-1', status: 'registered', event_id: 'event-1' }

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/v1/events/event-1/registrations/reg-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}
const makeParams = () => Promise.resolve({ eventId: 'event-1', registrationId: 'reg-1' })

beforeEach(() => {
  vi.resetAllMocks()
  mockDb.$executeRawUnsafe.mockResolvedValue(undefined)
  mockAuth.mockResolvedValue(SESSION)
})

describe('PATCH /api/v1/events/[eventId]/registrations/[registrationId]', () => {
  it('returns 403 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await PATCH(makeReq({ action: 'mark-attended' }), { params: makeParams() })
    expect(res.status).toBe(403)
  })

  it('returns 422 EVENT_NOT_STARTED when event is in the future', async () => {
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ ...EVENT, start_time: FUTURE }])
      .mockResolvedValueOnce([REG])
    const res = await PATCH(makeReq({ action: 'mark-attended' }), { params: makeParams() })
    const json = await res.json()
    expect(res.status).toBe(422)
    expect(json.error.code).toBe('EVENT_NOT_STARTED')
  })

  it('returns 422 INVALID_STATUS when registration is not registered', async () => {
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([EVENT])
      .mockResolvedValueOnce([{ ...REG, status: 'attended' }])
    const res = await PATCH(makeReq({ action: 'mark-attended' }), { params: makeParams() })
    const json = await res.json()
    expect(res.status).toBe(422)
    expect(json.error.code).toBe('INVALID_STATUS')
  })

  it('marks registration as attended on success', async () => {
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([EVENT])
      .mockResolvedValueOnce([REG])
      .mockResolvedValueOnce([{ id: 'reg-1', status: 'attended' }]) // UPDATE RETURNING
    const res = await PATCH(makeReq({ action: 'mark-attended' }), { params: makeParams() })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.data.registration.status).toBe('attended')
  })

  it('marks registration as no_show on success', async () => {
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([EVENT])
      .mockResolvedValueOnce([REG])
      .mockResolvedValueOnce([{ id: 'reg-1', status: 'no_show' }])
    const res = await PATCH(makeReq({ action: 'mark-no-show' }), { params: makeParams() })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.data.registration.status).toBe('no_show')
  })

  it('remove: decrements seats and fires Inngest', async () => {
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([EVENT])
      .mockResolvedValueOnce([REG])
      .mockResolvedValueOnce([{ id: 'event-1', seats_registered: 5 }]) // FOR UPDATE
    const res = await PATCH(makeReq({ action: 'remove' }), { params: makeParams() })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.data.registration.status).toBe('cancelled')
    expect(mockInngest.send).toHaveBeenCalledWith(expect.objectContaining({ name: 'event/registration.cancelled' }))
  })

  it('remove: returns 422 ALREADY_CANCELLED when registration is already cancelled', async () => {
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([EVENT])
      .mockResolvedValueOnce([{ ...REG, status: 'cancelled' }])
    const res = await PATCH(makeReq({ action: 'remove' }), { params: makeParams() })
    const json = await res.json()
    expect(res.status).toBe(422)
    expect(json.error.code).toBe('ALREADY_CANCELLED')
  })
})
