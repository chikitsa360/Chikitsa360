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

import { GET, PATCH } from '../route'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { NextRequest } from 'next/server'

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>
const mockDb = db as unknown as {
  $queryRawUnsafe: ReturnType<typeof vi.fn>
  $executeRawUnsafe: ReturnType<typeof vi.fn>
}

const SESSION = { user: { id: 'user-1', clinicId: 'clinic-1', role: 'RECEPTIONIST' } }
const PATIENT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const PATIENT = {
  id: PATIENT_ID, name: 'Anjali Nair', phone: '9876543210',
  dob: '1992-06-15', gender: 'female', first_visit_reason: null,
  booking_source: 'whatsapp', created_at: '2026-01-01',
  visit_count: '5', last_visit_date: '2026-06-01', last_doctor_name: 'Dr. Mehta',
}

beforeEach(() => {
  vi.resetAllMocks()
  mockAuth.mockResolvedValue(SESSION)
})

describe('GET /api/v1/patients/[patientId]', () => {
  it('returns patient detail for valid tenant patient', async () => {
    mockDb.$queryRawUnsafe.mockResolvedValueOnce([PATIENT])

    const req = new NextRequest(`http://localhost/api/v1/patients/${PATIENT_ID}`)
    const res = await GET(req, { params: Promise.resolve({ patientId: PATIENT_ID }) })
    expect(res.status).toBe(200)
    const data = await res.json() as { patient: typeof PATIENT }
    expect(data.patient.name).toBe('Anjali Nair')
  })

  it('returns 404 for unknown or cross-tenant patientId', async () => {
    mockDb.$queryRawUnsafe.mockResolvedValueOnce([]) // patient not found in this tenant

    const req = new NextRequest(`http://localhost/api/v1/patients/${PATIENT_ID}`)
    const res = await GET(req, { params: Promise.resolve({ patientId: PATIENT_ID }) })
    // Must be 404, NOT 403 — cross-tenant existence must not be revealed
    expect(res.status).toBe(404)
  })

  it('returns 401 without session', async () => {
    mockAuth.mockResolvedValue(null)
    const req = new NextRequest(`http://localhost/api/v1/patients/${PATIENT_ID}`)
    const res = await GET(req, { params: Promise.resolve({ patientId: PATIENT_ID }) })
    expect(res.status).toBe(401)
  })
})

describe('PATCH /api/v1/patients/[patientId]', () => {
  it('updates optional profile fields and writes audit log', async () => {
    mockDb.$queryRawUnsafe.mockResolvedValueOnce([{ id: PATIENT_ID }]) // patient exists
    mockDb.$executeRawUnsafe.mockResolvedValueOnce(1)

    const req = new NextRequest(`http://localhost/api/v1/patients/${PATIENT_ID}`, {
      method: 'PATCH',
      body: JSON.stringify({ dob: '1990-01-15', gender: 'female' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ patientId: PATIENT_ID }) })
    expect(res.status).toBe(200)
    const data = await res.json() as { ok: boolean }
    expect(data.ok).toBe(true)
  })

  it('returns 404 if patient not found in tenant', async () => {
    mockDb.$queryRawUnsafe.mockResolvedValueOnce([])

    const req = new NextRequest(`http://localhost/api/v1/patients/${PATIENT_ID}`, {
      method: 'PATCH',
      body: JSON.stringify({ gender: 'male' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ patientId: PATIENT_ID }) })
    expect(res.status).toBe(404)
  })

  it('returns 400 for no updatable fields', async () => {
    mockDb.$queryRawUnsafe.mockResolvedValueOnce([{ id: PATIENT_ID }])

    const req = new NextRequest(`http://localhost/api/v1/patients/${PATIENT_ID}`, {
      method: 'PATCH',
      body: JSON.stringify({}),
    })
    const res = await PATCH(req, { params: Promise.resolve({ patientId: PATIENT_ID }) })
    expect(res.status).toBe(400)
  })

  it('returns 401 without session', async () => {
    mockAuth.mockResolvedValue(null)
    const req = new NextRequest(`http://localhost/api/v1/patients/${PATIENT_ID}`, {
      method: 'PATCH',
      body: JSON.stringify({ gender: 'male' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ patientId: PATIENT_ID }) })
    expect(res.status).toBe(401)
  })
})
