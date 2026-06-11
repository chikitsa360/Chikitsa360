import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/db', () => ({
  db: {
    $queryRawUnsafe: vi.fn(),
    $executeRawUnsafe: vi.fn(),
  },
}))
vi.mock('@/lib/audit', () => ({ writeAuditLog: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/slug', () => ({
  generateSlug: vi.fn((title: string) => title.toLowerCase().replace(/\s+/g, '-')),
  suggestSlug: vi.fn((base: string, i: number) => `${base}-${i}`),
}))
vi.mock('@/lib/events/recurrence', () => ({
  generateRecurrenceDates: vi.fn(),
  validateWeeklyDayOfWeek: vi.fn().mockReturnValue(null),
}))

import { GET, POST } from '../route'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { generateRecurrenceDates } from '@/lib/events/recurrence'
import { NextRequest } from 'next/server'

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>
const mockDb = db as unknown as {
  $queryRawUnsafe: ReturnType<typeof vi.fn>
  $executeRawUnsafe: ReturnType<typeof vi.fn>
}
const mockGenerateRecurrenceDates = generateRecurrenceDates as unknown as ReturnType<typeof vi.fn>

const SESSION = { user: { id: 'user-1', clinicId: 'clinic-1', role: 'OWNER' } }
const EVENT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

function makeRequest(method: string, body?: unknown): NextRequest {
  return new NextRequest('http://localhost/api/v1/events', {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  mockAuth.mockResolvedValue(SESSION)
})

// ─── POST /api/v1/events ──────────────────────────────────────────────────────

describe('POST /api/v1/events — single event', () => {
  it('creates a single event and returns 201', async () => {
    const createdEvent = {
      id: EVENT_ID,
      title: 'Weight Management Workshop',
      slug: 'weight-management-workshop',
      status: 'draft',
      start_time: '2026-07-01T04:30:00+00:00',
      end_time: '2026-07-01T06:30:00+00:00',
      max_seats: 30,
      seats_registered: 0,
    }
    // slug uniqueness check → empty (slug available)
    mockDb.$queryRawUnsafe.mockResolvedValueOnce([])
    // INSERT returning event
    mockDb.$queryRawUnsafe.mockResolvedValueOnce([createdEvent])
    // slug insert into event_slugs
    mockDb.$executeRawUnsafe.mockResolvedValueOnce(1)

    const req = makeRequest('POST', {
      title: 'Weight Management Workshop',
      startTime: '2026-07-01T10:00:00+05:30',
      endTime: '2026-07-01T12:00:00+05:30',
      maxSeats: 30,
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.data.event.id).toBe(EVENT_ID)
    expect(json.data.event.status).toBe('draft')
  })

  it('returns 403 for unauthenticated request', async () => {
    mockAuth.mockResolvedValue(null)
    const req = makeRequest('POST', { title: 'X', startTime: '2026-07-01T10:00:00+05:30', endTime: '2026-07-01T12:00:00+05:30', maxSeats: 10 })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('returns 400 for validation error — missing title', async () => {
    const req = makeRequest('POST', { startTime: '2026-07-01T10:00:00+05:30', endTime: '2026-07-01T12:00:00+05:30', maxSeats: 10 })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 when endTime <= startTime', async () => {
    const req = makeRequest('POST', {
      title: 'Test',
      startTime: '2026-07-01T12:00:00+05:30',
      endTime: '2026-07-01T10:00:00+05:30',
      maxSeats: 10,
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error.details.endTime).toBeTruthy()
  })

  it('returns 400 for maxSeats > 500', async () => {
    const req = makeRequest('POST', {
      title: 'Test',
      startTime: '2026-07-01T10:00:00+05:30',
      endTime: '2026-07-01T12:00:00+05:30',
      maxSeats: 501,
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

describe('POST /api/v1/events — recurring series', () => {
  it('creates a series of events and returns 201', async () => {
    const seriesId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    const dates = Array.from({ length: 3 }, (_, i) => ({
      startTime: new Date(`2026-07-0${i + 2}T07:00:00Z`),
      endTime: new Date(`2026-07-0${i + 2}T08:00:00Z`),
    }))
    mockGenerateRecurrenceDates.mockReturnValue(dates)

    // series INSERT
    mockDb.$queryRawUnsafe.mockResolvedValueOnce([{ id: seriesId }])

    // For each of the 3 events: slug check + INSERT + slug_register
    for (let i = 0; i < 3; i++) {
      mockDb.$queryRawUnsafe.mockResolvedValueOnce([]) // slug unique check
      mockDb.$queryRawUnsafe.mockResolvedValueOnce([{ id: `event-${i}`, title: `Yoga — Session ${i + 1}`, slug: `yoga-session-${i + 1}`, status: 'draft', start_time: dates[i]!.startTime.toISOString(), end_time: dates[i]!.endTime.toISOString() }])
      mockDb.$executeRawUnsafe.mockResolvedValueOnce(1)
    }

    const req = makeRequest('POST', {
      title: 'Yoga Class',
      startTime: '2026-07-02T07:00:00+05:30',
      endTime: '2026-07-02T08:00:00+05:30',
      maxSeats: 20,
      recurrence: { type: 'weekly', dayOfWeek: 3, occurrences: 3 },
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.data.series.id).toBe(seriesId)
    expect(json.data.events).toHaveLength(3)
  })

  it('returns 400 for weekly recurrence missing dayOfWeek', async () => {
    const req = makeRequest('POST', {
      title: 'Yoga',
      startTime: '2026-07-02T07:00:00+05:30',
      endTime: '2026-07-02T08:00:00+05:30',
      maxSeats: 20,
      recurrence: { type: 'weekly', occurrences: 4 },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error.details?.['recurrence.dayOfWeek']).toBeTruthy()
  })
})

// ─── GET /api/v1/events ───────────────────────────────────────────────────────

describe('GET /api/v1/events', () => {
  it('returns paginated events list', async () => {
    const events = [{ id: EVENT_ID, title: 'Health Camp', status: 'published', start_time: '2026-07-01T04:30:00+00:00', end_time: '2026-07-01T06:30:00+00:00' }]
    mockDb.$queryRawUnsafe.mockResolvedValueOnce([{ total: '1' }]) // count
    mockDb.$queryRawUnsafe.mockResolvedValueOnce(events) // data

    const req = new NextRequest('http://localhost/api/v1/events?page=1&limit=10')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.total).toBe(1)
    expect(json.data.events).toHaveLength(1)
    expect(json.data.page).toBe(1)
  })

  it('filters by status', async () => {
    mockDb.$queryRawUnsafe.mockResolvedValueOnce([{ total: '2' }])
    mockDb.$queryRawUnsafe.mockResolvedValueOnce([])

    const req = new NextRequest('http://localhost/api/v1/events?status=published')
    const res = await GET(req)
    expect(res.status).toBe(200)
  })

  it('returns 400 for invalid status filter', async () => {
    const req = new NextRequest('http://localhost/api/v1/events?status=bogus')
    const res = await GET(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error.code).toBe('INVALID_STATUS')
  })

  it('returns 403 for unauthenticated request', async () => {
    mockAuth.mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/v1/events')
    const res = await GET(req)
    expect(res.status).toBe(403)
  })
})
