import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    clinic: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/lib/compute-available-slots', () => ({
  computeAvailableSlots: vi.fn(),
}))

import { GET } from '../available/route'
import { db } from '@/lib/db'
import { computeAvailableSlots } from '@/lib/compute-available-slots'
import { NextRequest } from 'next/server'

const mockDb = db as unknown as {
  clinic: { findUnique: ReturnType<typeof vi.fn> }
}
const mockCompute = computeAvailableSlots as ReturnType<typeof vi.fn>

function makeRequest(params: Record<string, string>) {
  const url = new URL('http://localhost/api/v1/slots/available')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new NextRequest(url.toString())
}

const ACTIVE_CLINIC = { id: 'clinic-xyz', trialEndsAt: null }

beforeEach(() => {
  vi.resetAllMocks()
})

describe('GET /api/v1/slots/available', () => {
  it('returns slots for a valid active clinic', async () => {
    mockDb.clinic.findUnique.mockResolvedValue(ACTIVE_CLINIC)
    const fakeSlots = [
      { doctorId: 'd1', doctorName: 'Dr. Smith', date: '2026-06-08', startTime: '10:00', endTime: '10:20' },
      { doctorId: 'd1', doctorName: 'Dr. Smith', date: '2026-06-08', startTime: '10:20', endTime: '10:40' },
    ]
    mockCompute.mockResolvedValue(fakeSlots)

    const res = await GET(makeRequest({ slug: 'test-clinic' }))
    expect(res.status).toBe(200)
    const data = await res.json() as { slots: unknown[] }
    expect(data.slots).toHaveLength(2)
  })

  it('returns planExpired flag for expired clinics', async () => {
    const expiredDate = new Date(Date.now() - 86400000)
    mockDb.clinic.findUnique.mockResolvedValue({ id: 'clinic-xyz', trialEndsAt: expiredDate })

    const res = await GET(makeRequest({ slug: 'test-clinic' }))
    expect(res.status).toBe(200)
    const data = await res.json() as { slots: unknown[]; planExpired: boolean }
    expect(data.slots).toHaveLength(0)
    expect(data.planExpired).toBe(true)
  })

  it('returns 404 for unknown slug', async () => {
    mockDb.clinic.findUnique.mockResolvedValue(null)
    const res = await GET(makeRequest({ slug: 'unknown-clinic' }))
    expect(res.status).toBe(404)
  })

  it('returns 400 for missing slug', async () => {
    const res = await GET(makeRequest({}))
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid slug format', async () => {
    const res = await GET(makeRequest({ slug: 'Invalid Slug!' }))
    expect(res.status).toBe(400)
  })

  it('respects days query parameter (up to 30)', async () => {
    mockDb.clinic.findUnique.mockResolvedValue(ACTIVE_CLINIC)
    mockCompute.mockResolvedValue([])

    await GET(makeRequest({ slug: 'test-clinic', days: '14' }))

    const calls = mockCompute.mock.calls
    expect(calls[0]?.[2]).toBe(14) // days argument
  })

  it('caps days parameter at 30', async () => {
    mockDb.clinic.findUnique.mockResolvedValue(ACTIVE_CLINIC)
    mockCompute.mockResolvedValue([])

    await GET(makeRequest({ slug: 'test-clinic', days: '999' }))

    const calls = mockCompute.mock.calls
    expect(calls[0]?.[2]).toBe(30)
  })

  it('filters by doctorId when provided', async () => {
    mockDb.clinic.findUnique.mockResolvedValue(ACTIVE_CLINIC)
    mockCompute.mockResolvedValue([])

    await GET(makeRequest({ slug: 'test-clinic', doctorId: 'd1' }))

    const calls = mockCompute.mock.calls
    expect(calls[0]?.[3]).toBe('d1') // doctorId argument
  })

  it('responds without auth — public endpoint', async () => {
    mockDb.clinic.findUnique.mockResolvedValue(ACTIVE_CLINIC)
    mockCompute.mockResolvedValue([])

    // No auth headers needed — should succeed
    const res = await GET(makeRequest({ slug: 'test-clinic' }))
    expect(res.status).toBe(200)
  })
})
