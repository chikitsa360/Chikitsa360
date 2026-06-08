import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/db', () => ({
  db: {
    $queryRawUnsafe: vi.fn(),
    $executeRawUnsafe: vi.fn(),
    $executeRaw: vi.fn(),
  },
}))
vi.mock('@/lib/audit', () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}))

import { GET, POST } from '../route'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { NextRequest } from 'next/server'

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>
const mockDb = db as unknown as {
  $queryRawUnsafe: ReturnType<typeof vi.fn>
  $executeRawUnsafe: ReturnType<typeof vi.fn>
}

const SESSION = { user: { id: 'user-1', clinicId: 'clinic-1', role: 'RECEPTIONIST' } }

beforeEach(() => {
  vi.resetAllMocks()
  mockAuth.mockResolvedValue(SESSION)
})

describe('GET /api/v1/patients', () => {
  it('returns paginated patient list', async () => {
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ total: '3' }])
      .mockResolvedValueOnce([
        { id: 'p1', name: 'Anjali Nair', phone: '9876543210', dob: null, gender: 'female', booking_source: 'whatsapp', created_at: '2026-01-01', last_visit_date: '2026-06-01', last_doctor_name: 'Dr. Mehta', visit_count: '5' },
      ])

    const req = new NextRequest('http://localhost/api/v1/patients?page=1&limit=20')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json() as { patients: unknown[]; pagination: { total: number } }
    expect(data.patients).toHaveLength(1)
    expect(data.pagination.total).toBe(3)
  })

  it('returns 401 without session', async () => {
    mockAuth.mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/v1/patients')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })
})

describe('POST /api/v1/patients', () => {
  it('creates a new patient when phone is unique', async () => {
    // No duplicate found
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([]) // existing phone check → empty
      .mockResolvedValueOnce([{ id: 'p-new', name: 'Ravi Kumar', phone: '9123456789', created_at: '2026-06-08' }])

    const req = new NextRequest('http://localhost/api/v1/patients', {
      method: 'POST',
      body: JSON.stringify({ name: 'Ravi Kumar', phone: '9123456789' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json() as { duplicate_found: boolean; patient: { name: string } }
    expect(data.duplicate_found).toBe(false)
    expect(data.patient.name).toBe('Ravi Kumar')
  })

  it('returns existing patient on duplicate phone without force_create', async () => {
    mockDb.$queryRawUnsafe.mockResolvedValueOnce([
      { id: 'p-existing', name: 'Existing Patient', created_at: '2026-01-01' },
    ])

    const req = new NextRequest('http://localhost/api/v1/patients', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Name', phone: '9876543210' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const data = await res.json() as { duplicate_found: boolean; patient: { name: string } }
    expect(data.duplicate_found).toBe(true)
    expect(data.patient.name).toBe('Existing Patient')
  })

  it('returns 400 for invalid phone number', async () => {
    const req = new NextRequest('http://localhost/api/v1/patients', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', phone: '1234567890' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 401 without session', async () => {
    mockAuth.mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/v1/patients', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', phone: '9876543210' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })
})
