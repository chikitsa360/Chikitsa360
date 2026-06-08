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

beforeEach(() => {
  vi.resetAllMocks()
})

describe('GET /api/v1/reports/patient-growth', () => {
  it('returns 403 for RECEPTIONIST', async () => {
    mockAuth.mockResolvedValue(RECEPTIONIST_SESSION)
    const req = new NextRequest('http://localhost/api/v1/reports/patient-growth?from=2026-01-01&to=2026-01-31')
    const res = await GET(req)
    expect(res.status).toBe(403)
  })

  it('uses weekly grouping for range ≤ 60 days', async () => {
    mockAuth.mockResolvedValue(OWNER_SESSION)
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ new_patients: '5', returning_patients: '3', total_unique: '8' }])
      .mockResolvedValueOnce([]) // weekly

    const req = new NextRequest('http://localhost/api/v1/reports/patient-growth?from=2026-01-01&to=2026-02-28')
    const res = await GET(req)
    const data = await res.json() as { groupedByMonth: boolean }
    expect(data.groupedByMonth).toBe(false)
    const weekCallArg = mockDb.$queryRawUnsafe.mock.calls[1]?.[0] as string
    expect(weekCallArg).toContain("DATE_TRUNC('week'")
  })

  it('uses monthly grouping for range > 60 days', async () => {
    mockAuth.mockResolvedValue(OWNER_SESSION)
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ new_patients: '10', returning_patients: '7', total_unique: '17' }])
      .mockResolvedValueOnce([]) // monthly

    const req = new NextRequest('http://localhost/api/v1/reports/patient-growth?from=2026-01-01&to=2026-04-01')
    const res = await GET(req)
    const data = await res.json() as { groupedByMonth: boolean }
    expect(data.groupedByMonth).toBe(true)
    const monthCallArg = mockDb.$queryRawUnsafe.mock.calls[1]?.[0] as string
    expect(monthCallArg).toContain("DATE_TRUNC('month'")
  })

  it('computes new patient definition: first appointment in range', async () => {
    mockAuth.mockResolvedValue(OWNER_SESSION)
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ new_patients: '3', returning_patients: '0', total_unique: '3' }])
      .mockResolvedValueOnce([])

    const req = new NextRequest('http://localhost/api/v1/reports/patient-growth?from=2026-01-01&to=2026-01-31')
    const res = await GET(req)
    const data = await res.json() as { summary: { newPatients: number; newPct: string } }
    expect(data.summary.newPatients).toBe(3)
    expect(data.summary.newPct).toBe('100.0')
    // Verify SQL uses MIN(appointment_date) for new patient definition
    const callArg = mockDb.$queryRawUnsafe.mock.calls[0]?.[0] as string
    expect(callArg).toContain('MIN(appointment_date)')
    expect(callArg).toContain('first_apt >= $1')
  })

  it('computes returning patient definition: prior appointment before range', async () => {
    mockAuth.mockResolvedValue(OWNER_SESSION)
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ new_patients: '2', returning_patients: '5', total_unique: '7' }])
      .mockResolvedValueOnce([])

    const req = new NextRequest('http://localhost/api/v1/reports/patient-growth?from=2026-01-01&to=2026-01-31')
    await GET(req)
    const callArg = mockDb.$queryRawUnsafe.mock.calls[0]?.[0] as string
    expect(callArg).toContain('first_apt < $1')
    expect(callArg).toContain('has_apt_in_range')
  })

  it('excludes sample appointments', async () => {
    mockAuth.mockResolvedValue(OWNER_SESSION)
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ new_patients: '0', returning_patients: '0', total_unique: '0' }])
      .mockResolvedValueOnce([])

    const req = new NextRequest('http://localhost/api/v1/reports/patient-growth?from=2026-01-01&to=2026-01-31')
    await GET(req)
    const callArg = mockDb.$queryRawUnsafe.mock.calls[0]?.[0] as string
    expect(callArg).toContain('is_sample = false')
  })
})
