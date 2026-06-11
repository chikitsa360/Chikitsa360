import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    $queryRawUnsafe: vi.fn(),
    $executeRawUnsafe: vi.fn(),
  },
}))
vi.mock('@/lib/inngest', () => ({ inngest: { send: vi.fn().mockResolvedValue(undefined) } }))

import { POST } from '../route'
import { db } from '@/lib/db'
import { inngest } from '@/lib/inngest'
import { NextRequest } from 'next/server'

const mockDb = db as unknown as {
  $queryRawUnsafe: ReturnType<typeof vi.fn>
  $executeRawUnsafe: ReturnType<typeof vi.fn>
}
const mockInngest = inngest as unknown as { send: ReturnType<typeof vi.fn> }

const SLUG = 'diabetes-camp'
const EVENT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const PATIENT_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

const PUBLISHED_EVENT = {
  id: EVENT_ID,
  status: 'published',
  registration_deadline: null,
  start_time: '2026-07-01T04:30:00+00:00',
  max_seats: 30,
  seats_registered: 5,
}

function makeRequest(body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/v1/events/${SLUG}/register`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

const PARAMS = Promise.resolve({ eventId: SLUG })

beforeEach(() => {
  vi.resetAllMocks()
})

describe('POST /api/v1/events/[slug]/register', () => {
  it('registers a patient and fires Inngest confirmation', async () => {
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ clinic_id: 'clinic-1' }])  // slug lookup
      .mockResolvedValueOnce([PUBLISHED_EVENT])              // event check
      .mockResolvedValueOnce([{ id: PATIENT_ID }])           // patient lookup
      .mockResolvedValueOnce([])                             // dup check
      .mockResolvedValueOnce([{ id: EVENT_ID, seats_registered: 5, max_seats: 30 }]) // FOR UPDATE lock
      .mockResolvedValueOnce([{ cnt: '5' }])                 // count for ref#
      .mockResolvedValueOnce([{ id: 'reg-1' }])              // INSERT registration
    mockDb.$executeRawUnsafe
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce(undefined) // UPDATE seats_registered
      .mockResolvedValueOnce(undefined) // COMMIT

    const req = makeRequest({ name: 'Ravi Kumar', phone: '9876543210' })
    const res = await POST(req, { params: PARAMS })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.status).toBe('registered')
    expect(json.data.referenceNumber).toMatch(/^EVT-/)
    expect(mockInngest.send).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'event/registration.confirm' as never })
    )
  })

  it('returns 422 when event is not published', async () => {
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ clinic_id: 'clinic-1' }])
      .mockResolvedValueOnce([{ ...PUBLISHED_EVENT, status: 'draft' }])
      .mockResolvedValueOnce([{ id: PATIENT_ID }]) // patient
      .mockResolvedValueOnce([]) // dup check

    const req = makeRequest({ name: 'Ravi Kumar', phone: '9876543210' })
    const res = await POST(req, { params: PARAMS })
    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.error.code).toBe('REGISTRATION_CLOSED')
  })

  it('returns 409 ALREADY_REGISTERED for duplicate', async () => {
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ clinic_id: 'clinic-1' }])
      .mockResolvedValueOnce([PUBLISHED_EVENT])
      .mockResolvedValueOnce([{ id: PATIENT_ID }]) // patient
      .mockResolvedValueOnce([{ reference_number: 'EVT-AAAA-001' }]) // dup found

    const req = makeRequest({ name: 'Ravi Kumar', phone: '9876543210' })
    const res = await POST(req, { params: PARAMS })
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error.code).toBe('ALREADY_REGISTERED')
  })

  it('returns seats_full when event is at capacity', async () => {
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ clinic_id: 'clinic-1' }])
      .mockResolvedValueOnce([{ ...PUBLISHED_EVENT, seats_registered: 30, max_seats: 30 }])
      .mockResolvedValueOnce([{ id: PATIENT_ID }]) // patient
      .mockResolvedValueOnce([]) // no dup
      .mockResolvedValueOnce([{ id: EVENT_ID, seats_registered: 30, max_seats: 30 }]) // FOR UPDATE
    mockDb.$executeRawUnsafe
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce(undefined) // ROLLBACK

    const req = makeRequest({ name: 'Ravi Kumar', phone: '9876543210' })
    const res = await POST(req, { params: PARAMS })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.status).toBe('seats_full')
  })

  it('adds to waitlist when joinWaitlist=true', async () => {
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ clinic_id: 'clinic-1' }])
      .mockResolvedValueOnce([PUBLISHED_EVENT])
      .mockResolvedValueOnce([{ id: PATIENT_ID }]) // patient
      .mockResolvedValueOnce([]) // no dup
      .mockResolvedValueOnce([{ pos: '2' }]) // waiting count
    mockDb.$executeRawUnsafe.mockResolvedValueOnce(undefined) // INSERT waitlist

    const req = makeRequest({ name: 'Ravi Kumar', phone: '9876543210', joinWaitlist: true })
    const res = await POST(req, { params: PARAMS })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.status).toBe('waitlisted')
    expect(json.data.position).toBe(3)
  })

  it('returns 404 for unknown slug', async () => {
    mockDb.$queryRawUnsafe.mockResolvedValueOnce([]) // slug not found
    const req = makeRequest({ name: 'Ravi Kumar', phone: '9876543210' })
    const res = await POST(req, { params: PARAMS })
    expect(res.status).toBe(404)
  })

  it('returns 400 for invalid phone', async () => {
    mockDb.$queryRawUnsafe.mockResolvedValueOnce([{ clinic_id: 'clinic-1' }]) // slug lookup succeeds
    const req = makeRequest({ name: 'Ravi Kumar', phone: '12345' })
    const res = await POST(req, { params: PARAMS })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error.code).toBe('VALIDATION_ERROR')
  })
})
