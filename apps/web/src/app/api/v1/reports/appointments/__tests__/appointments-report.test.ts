import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/db', () => ({ db: { $queryRawUnsafe: vi.fn() } }))

import { GET } from '../route'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { NextRequest } from 'next/server'

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>
const mockDb = db as unknown as { $queryRawUnsafe: ReturnType<typeof vi.fn> }

const OWNER_SESSION = { user: { id: 'u1', clinicId: 'c1', role: 'OWNER' } }
const RECEPTIONIST_SESSION = { user: { id: 'u2', clinicId: 'c1', role: 'RECEPTIONIST' } }
const DOCTOR_SESSION = { user: { id: 'u3', clinicId: 'c1', role: 'DOCTOR' } }

beforeEach(() => {
  vi.resetAllMocks()
})

describe('GET /api/v1/reports/appointments', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/v1/reports/appointments?from=2026-01-01&to=2026-01-31')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 for RECEPTIONIST', async () => {
    mockAuth.mockResolvedValue(RECEPTIONIST_SESSION)
    const req = new NextRequest('http://localhost/api/v1/reports/appointments?from=2026-01-01&to=2026-01-31')
    const res = await GET(req)
    expect(res.status).toBe(403)
  })

  it('returns 403 for DOCTOR', async () => {
    mockAuth.mockResolvedValue(DOCTOR_SESSION)
    const req = new NextRequest('http://localhost/api/v1/reports/appointments?from=2026-01-01&to=2026-01-31')
    const res = await GET(req)
    expect(res.status).toBe(403)
  })

  it('returns 400 when missing date params', async () => {
    mockAuth.mockResolvedValue(OWNER_SESSION)
    const req = new NextRequest('http://localhost/api/v1/reports/appointments')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns summary with zero counts when no appointments', async () => {
    mockAuth.mockResolvedValue(OWNER_SESSION)
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ total: '0', completed: '0', cancelled: '0', no_shows: '0' }]) // summary
      .mockResolvedValueOnce([]) // byDoctor

    const req = new NextRequest('http://localhost/api/v1/reports/appointments?from=2026-01-01&to=2026-01-31')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json() as { summary: { total: number }; byDoctor: unknown[] }
    expect(data.summary.total).toBe(0)
    expect(data.byDoctor).toEqual([])
  })

  it('returns correct summary percentages', async () => {
    mockAuth.mockResolvedValue(OWNER_SESSION)
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ total: '100', completed: '80', cancelled: '10', no_shows: '10' }])
      .mockResolvedValueOnce([])

    const req = new NextRequest('http://localhost/api/v1/reports/appointments?from=2026-01-01&to=2026-01-31')
    const res = await GET(req)
    const data = await res.json() as { summary: { completedPct: string; noShowPct: string } }
    expect(data.summary.completedPct).toBe('80.0')
    expect(data.summary.noShowPct).toBe('10.0')
  })

  it('excludes byDoctor table when doctorId filter is active', async () => {
    mockAuth.mockResolvedValue(OWNER_SESSION)
    mockDb.$queryRawUnsafe.mockResolvedValueOnce([{ total: '10', completed: '8', cancelled: '1', no_shows: '1' }])

    const req = new NextRequest(
      'http://localhost/api/v1/reports/appointments?from=2026-01-01&to=2026-01-31&doctorId=doctor-123'
    )
    const res = await GET(req)
    const data = await res.json() as { byDoctor: unknown[] }
    expect(data.byDoctor).toEqual([])
    // $queryRawUnsafe called once (summary only)
    expect(mockDb.$queryRawUnsafe).toHaveBeenCalledTimes(1)
  })

  it('excludes sample appointments from counts', async () => {
    mockAuth.mockResolvedValue(OWNER_SESSION)
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ total: '5', completed: '4', cancelled: '1', no_shows: '0' }])
      .mockResolvedValueOnce([])

    const req = new NextRequest('http://localhost/api/v1/reports/appointments?from=2026-01-01&to=2026-01-31')
    await GET(req)
    // Verify the SQL query contains is_sample = false
    const callArg = mockDb.$queryRawUnsafe.mock.calls[0]?.[0] as string
    expect(callArg).toContain('is_sample = false')
  })
})
