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
const EVENT = { id: 'event-1', max_seats: 10, seats_registered: 5 }
const ENTRY = { id: 'entry-1', status: 'waiting', patient_id: 'p-1', position: 1, event_id: 'event-1' }
const FUTURE_START = new Date(Date.now() + 86400000).toISOString()

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/v1/events/event-1/waiting-list/entry-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}
const makeParams = () => Promise.resolve({ eventId: 'event-1', entryId: 'entry-1' })

beforeEach(() => {
  vi.resetAllMocks()
  mockDb.$executeRawUnsafe.mockResolvedValue(undefined)
  mockAuth.mockResolvedValue(SESSION)
})

describe('PATCH /api/v1/events/[eventId]/waiting-list/[entryId]', () => {
  it('returns 403 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await PATCH(makeReq({ action: 'remove' }), { params: makeParams() })
    expect(res.status).toBe(403)
  })

  it('removes waiting list entry successfully', async () => {
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([EVENT])  // event check
      .mockResolvedValueOnce([ENTRY])  // entry load
    const res = await PATCH(makeReq({ action: 'remove' }), { params: makeParams() })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.data.entry.status).toBe('removed')
    expect(mockInngest.send).not.toHaveBeenCalled()
  })

  it('promotes waiting list entry when seats available', async () => {
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([EVENT])   // event check
      .mockResolvedValueOnce([ENTRY])   // entry load
      .mockResolvedValueOnce([{ ...EVENT, slug: 'health-camp', start_time: FUTURE_START }]) // FOR UPDATE
      .mockResolvedValueOnce([{ cnt: '3' }])  // count for ref number
      .mockResolvedValueOnce([{ id: 'new-reg-1' }]) // INSERT RETURNING
    const res = await PATCH(makeReq({ action: 'promote' }), { params: makeParams() })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.data.entry.status).toBe('promoted')
    expect(json.data.registrationId).toBe('new-reg-1')
    expect(mockInngest.send).toHaveBeenCalledWith(expect.objectContaining({ name: 'event/registration.confirm' }))
  })

  it('returns 422 SEATS_FULL when promote attempted with no seats', async () => {
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([EVENT])
      .mockResolvedValueOnce([ENTRY])
      .mockResolvedValueOnce([{ ...EVENT, seats_registered: 10, slug: 'health-camp', start_time: FUTURE_START }]) // full
    const res = await PATCH(makeReq({ action: 'promote' }), { params: makeParams() })
    const json = await res.json()
    expect(res.status).toBe(422)
    expect(json.error.code).toBe('SEATS_FULL')
  })

  it('returns 422 INVALID_STATUS when entry is not in waiting status', async () => {
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([EVENT])
      .mockResolvedValueOnce([{ ...ENTRY, status: 'promoted' }])
    const res = await PATCH(makeReq({ action: 'promote' }), { params: makeParams() })
    const json = await res.json()
    expect(res.status).toBe(422)
    expect(json.error.code).toBe('INVALID_STATUS')
  })
})
