import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/db', () => ({
  db: { $queryRawUnsafe: vi.fn() },
}))

import { GET } from '../route'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { NextRequest } from 'next/server'

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>
const mockDb = db as unknown as { $queryRawUnsafe: ReturnType<typeof vi.fn> }

const SESSION = { user: { id: 'user-1', clinicId: 'clinic-1', role: 'RECEPTIONIST' } }
const PATIENT = {
  id: 'p1', name: 'Anjali Nair', phone: '9876543210',
  dob: null, gender: 'female', booking_source: 'whatsapp',
  created_at: '2026-01-01', last_visit_date: '2026-06-01', last_doctor_name: 'Dr. Mehta',
}

beforeEach(() => {
  vi.resetAllMocks()
  mockAuth.mockResolvedValue(SESSION)
})

describe('GET /api/v1/patients/search', () => {
  it('returns empty for query < 3 chars', async () => {
    const req = new NextRequest('http://localhost/api/v1/patients/search?q=An')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json() as { patients: unknown[] }
    expect(data.patients).toHaveLength(0)
  })

  it('searches by name (ILIKE, case-insensitive, 3+ chars)', async () => {
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ total: '1' }])
      .mockResolvedValueOnce([PATIENT])

    const req = new NextRequest('http://localhost/api/v1/patients/search?q=anjali')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json() as { patients: typeof PATIENT[]; total: number }
    expect(data.patients).toHaveLength(1)
    expect(data.patients[0]?.name).toBe('Anjali Nair')
    expect(data.total).toBe(1)
  })

  it('searches by last-4-digit phone', async () => {
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ total: '1' }])
      .mockResolvedValueOnce([PATIENT])

    const req = new NextRequest('http://localhost/api/v1/patients/search?q=3210')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json() as { patients: typeof PATIENT[] }
    expect(data.patients[0]?.phone).toBe('9876543210')
  })

  it('searches by full 10-digit phone (exact match)', async () => {
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ total: '1' }])
      .mockResolvedValueOnce([PATIENT])

    const req = new NextRequest('http://localhost/api/v1/patients/search?q=9876543210')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json() as { patients: typeof PATIENT[] }
    expect(data.patients).toHaveLength(1)
  })

  it('returns 403 when clinicId param does not match session', async () => {
    const req = new NextRequest('http://localhost/api/v1/patients/search?q=test&clinicId=other-clinic')
    const res = await GET(req)
    expect(res.status).toBe(403)
  })

  it('returns 401 without session', async () => {
    mockAuth.mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/v1/patients/search?q=test')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns empty results when no patients match', async () => {
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ total: '0' }])
      .mockResolvedValueOnce([])

    const req = new NextRequest('http://localhost/api/v1/patients/search?q=zzz')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json() as { patients: unknown[]; total: number }
    expect(data.patients).toHaveLength(0)
    expect(data.total).toBe(0)
  })
})
