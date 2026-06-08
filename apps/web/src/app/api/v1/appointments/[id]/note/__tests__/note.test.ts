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

import { PATCH } from '../route'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { NextRequest } from 'next/server'

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>
const mockDb = db as unknown as {
  $queryRawUnsafe: ReturnType<typeof vi.fn>
  $executeRawUnsafe: ReturnType<typeof vi.fn>
}

const APPT_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const DOCTOR_SESSION = { user: { id: 'user-doc', clinicId: 'clinic-1', role: 'DOCTOR' } }
const OWNER_SESSION = { user: { id: 'user-own', clinicId: 'clinic-1', role: 'OWNER' } }
const RECEPTIONIST_SESSION = { user: { id: 'user-rec', clinicId: 'clinic-1', role: 'RECEPTIONIST' } }
const OTHER_CLINIC_SESSION = { user: { id: 'user-other', clinicId: 'clinic-2', role: 'DOCTOR' } }

beforeEach(() => {
  vi.resetAllMocks()
  mockAuth.mockResolvedValue(DOCTOR_SESSION)
})

describe('PATCH /api/v1/appointments/[id]/note', () => {
  it('allows DOCTOR to save a visit note on completed appointment', async () => {
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ id: APPT_ID, patient_id: 'p1', status: 'completed' }])
      .mockResolvedValueOnce([]) // no existing note
      .mockResolvedValueOnce([{ doctor_id: 'doc-1' }]) // doctor lookup
    mockDb.$executeRawUnsafe.mockResolvedValue(1)

    const req = new NextRequest(`http://localhost/api/v1/appointments/${APPT_ID}/note`, {
      method: 'PATCH',
      body: JSON.stringify({ note: 'BP controlled, continue medication.' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: APPT_ID }) })
    expect(res.status).toBe(200)
    const data = await res.json() as { ok: boolean; note: string }
    expect(data.ok).toBe(true)
    expect(data.note).toBe('BP controlled, continue medication.')
  })

  it('allows OWNER to save a visit note', async () => {
    mockAuth.mockResolvedValue(OWNER_SESSION)
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ id: APPT_ID, patient_id: 'p1', status: 'completed' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ doctor_id: 'doc-1' }])
    mockDb.$executeRawUnsafe.mockResolvedValue(1)

    const req = new NextRequest(`http://localhost/api/v1/appointments/${APPT_ID}/note`, {
      method: 'PATCH',
      body: JSON.stringify({ note: 'Owner note.' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: APPT_ID }) })
    expect(res.status).toBe(200)
  })

  it('returns 403 for RECEPTIONIST', async () => {
    mockAuth.mockResolvedValue(RECEPTIONIST_SESSION)

    const req = new NextRequest(`http://localhost/api/v1/appointments/${APPT_ID}/note`, {
      method: 'PATCH',
      body: JSON.stringify({ note: 'Should fail.' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: APPT_ID }) })
    expect(res.status).toBe(403)
  })

  it('returns 422 for non-completed appointment status', async () => {
    mockDb.$queryRawUnsafe.mockResolvedValueOnce([
      { id: APPT_ID, patient_id: 'p1', status: 'confirmed' },
    ])

    const req = new NextRequest(`http://localhost/api/v1/appointments/${APPT_ID}/note`, {
      method: 'PATCH',
      body: JSON.stringify({ note: 'Should fail.' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: APPT_ID }) })
    expect(res.status).toBe(422)
    const data = await res.json() as { error: string }
    expect(data.error).toContain('completed')
  })

  it('returns 404 for appointment not in clinic', async () => {
    mockAuth.mockResolvedValue(OTHER_CLINIC_SESSION)
    mockDb.$queryRawUnsafe.mockResolvedValueOnce([]) // not found in clinic-2 schema

    const req = new NextRequest(`http://localhost/api/v1/appointments/${APPT_ID}/note`, {
      method: 'PATCH',
      body: JSON.stringify({ note: 'Cross-clinic attempt.' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: APPT_ID }) })
    expect(res.status).toBe(404)
  })

  it('updates existing note (overwrites)', async () => {
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ id: APPT_ID, patient_id: 'p1', status: 'completed' }])
      .mockResolvedValueOnce([{ id: 'note-1', note: 'Old note.' }]) // existing note
    mockDb.$executeRawUnsafe.mockResolvedValue(1)

    const req = new NextRequest(`http://localhost/api/v1/appointments/${APPT_ID}/note`, {
      method: 'PATCH',
      body: JSON.stringify({ note: 'Updated note.' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: APPT_ID }) })
    expect(res.status).toBe(200)
  })

  it('returns 401 without session', async () => {
    mockAuth.mockResolvedValue(null)
    const req = new NextRequest(`http://localhost/api/v1/appointments/${APPT_ID}/note`, {
      method: 'PATCH',
      body: JSON.stringify({ note: 'Test.' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: APPT_ID }) })
    expect(res.status).toBe(401)
  })
})
