import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/db', () => ({
  db: {
    $queryRawUnsafe: vi.fn(),
    $executeRawUnsafe: vi.fn(),
  },
}))
vi.mock('@/lib/audit', () => ({ writeAuditLog: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/inngest', () => ({ inngest: { send: vi.fn().mockResolvedValue(undefined) } }))

import { GET, PATCH } from '../route'
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

const SESSION = { user: { id: 'user-1', clinicId: 'clinic-1', role: 'OWNER' } }
const EVENT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

const DRAFT_EVENT = {
  id: EVENT_ID,
  clinic_id: 'clinic-1',
  series_id: null,
  title: 'Diabetes Camp',
  description: null,
  start_time: new Date('2026-07-01T04:30:00Z'),
  end_time: new Date('2026-07-01T06:30:00Z'),
  venue: null,
  meeting_link: null,
  max_seats: 30,
  seats_registered: 0,
  registration_deadline: null,
  fee_paise: null,
  status: 'draft',
  slug: 'diabetes-camp',
  created_by: 'user-1',
  created_at: new Date(),
  updated_at: new Date(),
}

const PUBLISHED_EVENT = { ...DRAFT_EVENT, status: 'published' }

function makeRequest(method: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/v1/events/${EVENT_ID}`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  })
}

const PARAMS = Promise.resolve({ eventId: EVENT_ID })

beforeEach(() => {
  vi.resetAllMocks()
  mockAuth.mockResolvedValue(SESSION)
})

// ─── GET /api/v1/events/[eventId] ─────────────────────────────────────────────

describe('GET /api/v1/events/[eventId]', () => {
  it('returns event detail with aggregates', async () => {
    mockDb.$queryRawUnsafe.mockResolvedValueOnce([{
      ...DRAFT_EVENT,
      registered_count: 5,
      waiting_count: 2,
      invited_sent_count: 10,
      series_recurrence_type: null,
      series_total_occurrences: null,
    }])

    const req = makeRequest('GET')
    const res = await GET(req, { params: PARAMS })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.event.id).toBe(EVENT_ID)
    expect(json.data.event.registered_count).toBe(5)
  })

  it('returns 404 for unknown event', async () => {
    mockDb.$queryRawUnsafe.mockResolvedValueOnce([])
    const req = makeRequest('GET')
    const res = await GET(req, { params: PARAMS })
    expect(res.status).toBe(404)
  })

  it('returns 403 for unauthenticated request', async () => {
    mockAuth.mockResolvedValue(null)
    const req = makeRequest('GET')
    const res = await GET(req, { params: PARAMS })
    expect(res.status).toBe(403)
  })
})

// ─── PATCH — publish ─────────────────────────────────────────────────────────

describe('PATCH /api/v1/events/[eventId] — publish', () => {
  it('publishes a draft event → status=published', async () => {
    mockDb.$queryRawUnsafe.mockResolvedValueOnce([DRAFT_EVENT]) // fetch existing
    mockDb.$queryRawUnsafe.mockResolvedValueOnce([{ ...DRAFT_EVENT, status: 'published' }]) // RETURNING *

    const req = makeRequest('PATCH', { action: 'publish' })
    const res = await PATCH(req, { params: PARAMS })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.event.status).toBe('published')
  })

  it('returns 422 when trying to publish an already-published event', async () => {
    mockDb.$queryRawUnsafe.mockResolvedValueOnce([PUBLISHED_EVENT])
    const req = makeRequest('PATCH', { action: 'publish' })
    const res = await PATCH(req, { params: PARAMS })
    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.error.code).toBe('INVALID_STATUS_TRANSITION')
  })

  it('returns 422 when trying to publish a cancelled event', async () => {
    mockDb.$queryRawUnsafe.mockResolvedValueOnce([{ ...DRAFT_EVENT, status: 'cancelled' }])
    const req = makeRequest('PATCH', { action: 'publish' })
    const res = await PATCH(req, { params: PARAMS })
    expect(res.status).toBe(422)
  })
})

// ─── PATCH — cancel ───────────────────────────────────────────────────────────

describe('PATCH /api/v1/events/[eventId] — cancel', () => {
  it('cancels a published event and fires Inngest event', async () => {
    mockDb.$queryRawUnsafe.mockResolvedValueOnce([PUBLISHED_EVENT]) // fetch existing
    mockDb.$queryRawUnsafe.mockResolvedValueOnce([{ ...PUBLISHED_EVENT, status: 'cancelled' }]) // RETURNING *

    const req = makeRequest('PATCH', { action: 'cancel' })
    const res = await PATCH(req, { params: PARAMS })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.event.status).toBe('cancelled')
    expect(mockInngest.send).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'event/cancel.notify' as never })
    )
  })

  it('returns 422 when trying to cancel a draft event', async () => {
    mockDb.$queryRawUnsafe.mockResolvedValueOnce([DRAFT_EVENT])
    const req = makeRequest('PATCH', { action: 'cancel' })
    const res = await PATCH(req, { params: PARAMS })
    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.error.code).toBe('INVALID_STATUS_TRANSITION')
  })
})

// ─── PATCH — field edit ───────────────────────────────────────────────────────

describe('PATCH /api/v1/events/[eventId] — field edit', () => {
  it('updates title on a draft event', async () => {
    mockDb.$queryRawUnsafe.mockResolvedValueOnce([DRAFT_EVENT]) // fetch existing
    mockDb.$executeRawUnsafe.mockResolvedValueOnce(1) // UPDATE
    mockDb.$queryRawUnsafe.mockResolvedValueOnce([{ ...DRAFT_EVENT, title: 'New Title' }]) // re-fetch

    const req = makeRequest('PATCH', { title: 'New Title' })
    const res = await PATCH(req, { params: PARAMS })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.event.title).toBe('New Title')
  })

  it('returns 422 when editing a cancelled event', async () => {
    mockDb.$queryRawUnsafe.mockResolvedValueOnce([{ ...DRAFT_EVENT, status: 'cancelled' }])
    const req = makeRequest('PATCH', { title: 'New Title' })
    const res = await PATCH(req, { params: PARAMS })
    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.error.code).toBe('EVENT_NOT_EDITABLE')
  })

  it('returns 422 when reducing maxSeats below seats_registered', async () => {
    mockDb.$queryRawUnsafe.mockResolvedValueOnce([{ ...DRAFT_EVENT, seats_registered: 10 }])
    const req = makeRequest('PATCH', { maxSeats: 5 })
    const res = await PATCH(req, { params: PARAMS })
    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.error.code).toBe('SEATS_BELOW_REGISTERED')
  })

  it('fires change notification when start_time changed on published event', async () => {
    mockDb.$queryRawUnsafe.mockResolvedValueOnce([PUBLISHED_EVENT]) // fetch existing
    mockDb.$executeRawUnsafe.mockResolvedValueOnce(1) // UPDATE
    mockDb.$queryRawUnsafe.mockResolvedValueOnce([PUBLISHED_EVENT]) // re-fetch

    const req = makeRequest('PATCH', { startTime: '2026-07-02T10:00:00+05:30', endTime: '2026-07-02T12:00:00+05:30' })
    const res = await PATCH(req, { params: PARAMS })
    expect(res.status).toBe(200)
    expect(mockInngest.send).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'event/change.notify' as never })
    )
  })

  it('does NOT fire change notification for draft event edit', async () => {
    mockDb.$queryRawUnsafe.mockResolvedValueOnce([DRAFT_EVENT]) // fetch existing
    mockDb.$executeRawUnsafe.mockResolvedValueOnce(1) // UPDATE
    mockDb.$queryRawUnsafe.mockResolvedValueOnce([DRAFT_EVENT]) // re-fetch

    const req = makeRequest('PATCH', { title: 'Changed Title' })
    const res = await PATCH(req, { params: PARAMS })
    expect(res.status).toBe(200)
    expect(mockInngest.send).not.toHaveBeenCalled()
  })

  it('returns 404 for unknown event', async () => {
    mockDb.$queryRawUnsafe.mockResolvedValueOnce([])
    const req = makeRequest('PATCH', { action: 'publish' })
    const res = await PATCH(req, { params: PARAMS })
    expect(res.status).toBe(404)
  })
})
