import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    $queryRawUnsafe: vi.fn(),
    clinic: { findUnique: vi.fn() },
  },
}))

import { GET } from '../route'
import { db } from '@/lib/db'
import { NextRequest } from 'next/server'

const mockDb = db as unknown as {
  $queryRawUnsafe: ReturnType<typeof vi.fn>
  clinic: { findUnique: ReturnType<typeof vi.fn> }
}

const SLUG = 'diabetes-camp'
const EVENT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

const PARAMS = Promise.resolve({ slug: SLUG })

beforeEach(() => {
  vi.resetAllMocks()
})

describe('GET /api/v1/events/by-slug/[slug]', () => {
  it('returns event data and clinic name for a published event', async () => {
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ clinic_id: 'clinic-1' }]) // slug lookup
      .mockResolvedValueOnce([{ id: EVENT_ID, title: 'Diabetes Camp', status: 'published', start_time: '2026-07-01T04:30:00+00:00', end_time: '2026-07-01T06:30:00+00:00', description: null, venue: 'Hall A', meeting_link: null, max_seats: 30, seats_registered: 10, registration_deadline: null, fee_paise: null, slug: SLUG, series_id: null }]) // event
      .mockResolvedValueOnce([{ waiting_count: '2' }]) // waiting list count
    mockDb.clinic.findUnique.mockResolvedValueOnce({ name: 'City Clinic', id: 'clinic-1' })

    const req = new NextRequest(`http://localhost/api/v1/events/by-slug/${SLUG}`)
    const res = await GET(req, { params: PARAMS })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.event.id).toBe(EVENT_ID)
    expect(json.data.event.waiting_count).toBe(2)
    expect(json.data.clinic.name).toBe('City Clinic')
  })

  it('returns 404 for unknown slug', async () => {
    mockDb.$queryRawUnsafe.mockResolvedValueOnce([]) // slug not found

    const req = new NextRequest(`http://localhost/api/v1/events/by-slug/unknown`)
    const res = await GET(req, { params: Promise.resolve({ slug: 'unknown' }) })
    expect(res.status).toBe(404)
  })

  it('includes series_label for events in a series', async () => {
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ clinic_id: 'clinic-1' }])
      .mockResolvedValueOnce([{ id: EVENT_ID, title: 'Yoga — Session 1', status: 'published', start_time: '2026-07-01T04:30:00+00:00', end_time: '2026-07-01T05:30:00+00:00', description: null, venue: null, meeting_link: null, max_seats: 20, seats_registered: 5, registration_deadline: null, fee_paise: null, slug: SLUG, series_id: 'series-1' }])
      .mockResolvedValueOnce([{ waiting_count: '0' }])
      .mockResolvedValueOnce([{ recurrence_type: 'weekly', total_occurrences: 8 }]) // series
    mockDb.clinic.findUnique.mockResolvedValueOnce({ name: 'City Clinic', id: 'clinic-1' })

    const req = new NextRequest(`http://localhost/api/v1/events/by-slug/${SLUG}`)
    const res = await GET(req, { params: PARAMS })
    const json = await res.json()
    expect(json.data.event.series_label).toContain('weekly')
  })
})
