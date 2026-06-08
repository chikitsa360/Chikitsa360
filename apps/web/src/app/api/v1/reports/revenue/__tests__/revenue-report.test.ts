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

describe('GET /api/v1/reports/revenue', () => {
  it('returns 403 for RECEPTIONIST', async () => {
    mockAuth.mockResolvedValue(RECEPTIONIST_SESSION)
    const req = new NextRequest('http://localhost/api/v1/reports/revenue?from=2026-01-01&to=2026-01-31')
    const res = await GET(req)
    expect(res.status).toBe(403)
  })

  it('returns zero revenue when no paid appointments', async () => {
    mockAuth.mockResolvedValue(OWNER_SESSION)
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ total_revenue: '0', total_pending: '0', paid_count: '0', avg_fee: null }])
      .mockResolvedValueOnce([]) // byDoctor
      .mockResolvedValueOnce([]) // byDay

    const req = new NextRequest('http://localhost/api/v1/reports/revenue?from=2026-01-01&to=2026-01-31')
    const res = await GET(req)
    const data = await res.json() as { summary: { totalRevenue: number; avgFee: number | null } }
    expect(data.summary.totalRevenue).toBe(0)
    expect(data.summary.avgFee).toBeNull()
  })

  it('only counts paid appointments in revenue', async () => {
    mockAuth.mockResolvedValue(OWNER_SESSION)
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ total_revenue: '5000', total_pending: '3', paid_count: '5', avg_fee: '1000' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const req = new NextRequest('http://localhost/api/v1/reports/revenue?from=2026-01-01&to=2026-01-31')
    const res = await GET(req)
    const data = await res.json() as { summary: { totalRevenue: number; paidCount: number; avgFee: number } }
    expect(data.summary.totalRevenue).toBe(5000)
    expect(data.summary.paidCount).toBe(5)
    expect(data.summary.avgFee).toBe(1000)
    // Verify SQL uses payment_status = 'paid'
    const callArg = mockDb.$queryRawUnsafe.mock.calls[0]?.[0] as string
    expect(callArg).toContain("payment_status = 'paid'")
  })

  it('uses weekly grouping for ranges > 30 days', async () => {
    mockAuth.mockResolvedValue(OWNER_SESSION)
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ total_revenue: '0', total_pending: '0', paid_count: '0', avg_fee: null }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]) // weekly query

    const req = new NextRequest('http://localhost/api/v1/reports/revenue?from=2026-01-01&to=2026-03-31')
    const res = await GET(req)
    const data = await res.json() as { groupedByWeek: boolean }
    expect(data.groupedByWeek).toBe(true)
    // Verify DATE_TRUNC('week') in query
    const weekCallArg = mockDb.$queryRawUnsafe.mock.calls[2]?.[0] as string
    expect(weekCallArg).toContain("DATE_TRUNC('week'")
  })

  it('excludes sample appointments', async () => {
    mockAuth.mockResolvedValue(OWNER_SESSION)
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ total_revenue: '0', total_pending: '0', paid_count: '0', avg_fee: null }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const req = new NextRequest('http://localhost/api/v1/reports/revenue?from=2026-01-01&to=2026-01-31')
    await GET(req)
    const callArg = mockDb.$queryRawUnsafe.mock.calls[0]?.[0] as string
    expect(callArg).toContain('is_sample = false')
  })
})
