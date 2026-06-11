import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/db', () => ({
  db: {
    clinic: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $executeRaw: vi.fn(),
  },
}))
vi.mock('@/lib/audit', () => ({ writeAuditLog: vi.fn().mockResolvedValue(undefined) }))

import { PATCH } from '../route'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { NextRequest } from 'next/server'

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockDb = db as unknown as {
  clinic: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> }
}

const SUPER_ADMIN = {
  user: { id: 'admin-1', clinicId: null, role: 'OWNER', systemRole: 'super_admin' },
}

const REGULAR_USER = {
  user: { id: 'user-1', clinicId: 'clinic-1', role: 'OWNER', systemRole: null },
}

const EXISTING_CLINIC = {
  id: 'clinic-1',
  name: 'City Clinic',
  plan: 'STARTER',
  planExpiresAt: new Date(Date.now() + 30 * 86400000),
  doctorLimit: 2,
}

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/admin/clinics/clinic-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeParams(clinicId: string) {
  return { params: Promise.resolve({ clinicId }) }
}

beforeEach(() => { vi.resetAllMocks() })

describe('PATCH /api/admin/clinics/[clinicId]', () => {
  it('returns 403 for non-super-admin', async () => {
    mockAuth.mockResolvedValue(REGULAR_USER)
    const res = await PATCH(makeRequest({ plan: 'PRO' }), makeParams('clinic-1'))
    expect(res.status).toBe(403)
  })

  it('returns 404 for unknown clinic', async () => {
    mockAuth.mockResolvedValue(SUPER_ADMIN)
    mockDb.clinic.findUnique.mockResolvedValue(null)
    const res = await PATCH(makeRequest({ plan: 'PRO' }), makeParams('unknown-clinic'))
    expect(res.status).toBe(404)
  })

  it('updates plan and returns updated clinic', async () => {
    mockAuth.mockResolvedValue(SUPER_ADMIN)
    mockDb.clinic.findUnique.mockResolvedValue(EXISTING_CLINIC)
    mockDb.clinic.update.mockResolvedValue({
      id: 'clinic-1',
      name: 'City Clinic',
      plan: 'PRO',
      planExpiresAt: new Date(Date.now() + 365 * 86400000),
      doctorLimit: 5,
    })

    const res = await PATCH(
      makeRequest({ plan: 'PRO', doctorLimit: 5 }),
      makeParams('clinic-1')
    )
    expect(res.status).toBe(200)
    const data = await res.json() as { plan: string; doctorLimit: number }
    expect(data.plan).toBe('PRO')
    expect(data.doctorLimit).toBe(5)
  })

  it('returns 400 for invalid doctorLimit', async () => {
    mockAuth.mockResolvedValue(SUPER_ADMIN)
    mockDb.clinic.findUnique.mockResolvedValue(EXISTING_CLINIC)

    const res = await PATCH(makeRequest({ doctorLimit: -1 }), makeParams('clinic-1'))
    expect(res.status).toBe(400)
  })
})
