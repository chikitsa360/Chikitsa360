import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/db', () => ({
  db: {
    clinic: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}))

import { GET } from '../route'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { NextRequest } from 'next/server'

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockDb = db as unknown as {
  clinic: { findMany: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> }
}

const SUPER_ADMIN = {
  user: { id: 'admin-1', clinicId: null, role: 'OWNER', systemRole: 'super_admin' },
}

const REGULAR_USER = {
  user: { id: 'user-1', clinicId: 'clinic-1', role: 'OWNER', systemRole: null },
}

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/admin/clinics')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new NextRequest(url.toString())
}

const MOCK_CLINIC = {
  id: 'clinic-1',
  name: 'City Clinic',
  slug: 'city-clinic',
  plan: 'STARTER',
  planExpiresAt: new Date(Date.now() + 30 * 86400000),
  doctorLimit: 2,
  createdAt: new Date('2026-01-01'),
  users: [{ id: 'user-1', name: 'Dr. Owner', phone: '9876543210' }],
  _count: { users: 1 },
}

beforeEach(() => { vi.resetAllMocks() })

describe('GET /api/admin/clinics', () => {
  it('returns 403 for non-super-admin', async () => {
    mockAuth.mockResolvedValue(REGULAR_USER)
    const res = await GET(makeRequest())
    expect(res.status).toBe(403)
  })

  it('returns 403 for unauthenticated request', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await GET(makeRequest())
    expect(res.status).toBe(403)
  })

  it('returns paginated clinic list for super admin', async () => {
    mockAuth.mockResolvedValue(SUPER_ADMIN)
    mockDb.clinic.findMany.mockResolvedValue([MOCK_CLINIC])
    mockDb.clinic.count.mockResolvedValue(1)

    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const data = await res.json() as { clinics: unknown[]; total: number }
    expect(data.clinics).toHaveLength(1)
    expect(data.total).toBe(1)
  })

  it('computes planStatus correctly for active clinic', async () => {
    mockAuth.mockResolvedValue(SUPER_ADMIN)
    mockDb.clinic.findMany.mockResolvedValue([MOCK_CLINIC])
    mockDb.clinic.count.mockResolvedValue(1)

    const res = await GET(makeRequest())
    const data = await res.json() as { clinics: Array<{ planStatus: string }> }
    expect(data.clinics[0]?.planStatus).toBe('active')
  })

  it('computes planStatus expired for past expiry', async () => {
    mockAuth.mockResolvedValue(SUPER_ADMIN)
    mockDb.clinic.findMany.mockResolvedValue([{
      ...MOCK_CLINIC,
      planExpiresAt: new Date(Date.now() - 86400000),
    }])
    mockDb.clinic.count.mockResolvedValue(1)

    const res = await GET(makeRequest())
    const data = await res.json() as { clinics: Array<{ planStatus: string }> }
    expect(data.clinics[0]?.planStatus).toBe('expired')
  })
})
