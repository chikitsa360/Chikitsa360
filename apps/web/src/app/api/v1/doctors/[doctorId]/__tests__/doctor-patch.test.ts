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
import { writeAuditLog } from '@/lib/audit'
import { NextRequest } from 'next/server'

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>
const mockDb = db as unknown as {
  $queryRawUnsafe: ReturnType<typeof vi.fn>
  $executeRawUnsafe: ReturnType<typeof vi.fn>
}
const mockAudit = writeAuditLog as unknown as ReturnType<typeof vi.fn>

const DOCTOR_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd'
const OWNER_SESSION = { user: { id: 'user-own', clinicId: 'clinic-1', role: 'OWNER' } }
const RECEPTIONIST_SESSION = { user: { id: 'user-rec', clinicId: 'clinic-1', role: 'RECEPTIONIST' } }

function mockExistingDoctor(overrides: object = {}) {
  return [{ id: DOCTOR_ID, name: 'Dr. Sharma', speciality: 'General', default_fee: null, ...overrides }]
}

function makeReq(body: object) {
  return new NextRequest(`http://localhost/api/v1/doctors/${DOCTOR_ID}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  mockAuth.mockResolvedValue(OWNER_SESSION)
})

describe('PATCH /api/v1/doctors/[doctorId]', () => {
  it('saves default_fee = 500 and returns updated doctor', async () => {
    mockDb.$queryRawUnsafe.mockResolvedValueOnce(mockExistingDoctor())
    mockDb.$executeRawUnsafe.mockResolvedValue(1)

    const res = await PATCH(makeReq({ default_fee: 500 }), {
      params: Promise.resolve({ doctorId: DOCTOR_ID }),
    })
    expect(res.status).toBe(200)
    const data = await res.json() as { default_fee: number }
    expect(data.default_fee).toBe(500)
  })

  it('saves default_fee = 0 (free consultation — valid)', async () => {
    mockDb.$queryRawUnsafe.mockResolvedValueOnce(mockExistingDoctor())
    mockDb.$executeRawUnsafe.mockResolvedValue(1)

    const res = await PATCH(makeReq({ default_fee: 0 }), {
      params: Promise.resolve({ doctorId: DOCTOR_ID }),
    })
    expect(res.status).toBe(200)
    const data = await res.json() as { default_fee: number }
    expect(data.default_fee).toBe(0)
  })

  it('writes audit log when default_fee changes', async () => {
    mockDb.$queryRawUnsafe.mockResolvedValueOnce(mockExistingDoctor({ default_fee: '300' }))
    mockDb.$executeRawUnsafe.mockResolvedValue(1)

    await PATCH(makeReq({ default_fee: 700 }), {
      params: Promise.resolve({ doctorId: DOCTOR_ID }),
    })

    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SETTINGS_CHANGE',
        metadata: expect.objectContaining({ field: 'default_fee', oldValue: 300, newValue: 700 }),
      })
    )
  })

  it('does not change existing non-null consultation_fee on appointments (read-only test — no appointment update called)', async () => {
    // Changing default_fee does NOT update existing appointment fees.
    // The PATCH only modifies the doctors table — no appointment update is made.
    mockDb.$queryRawUnsafe.mockResolvedValueOnce(mockExistingDoctor({ default_fee: '500' }))
    mockDb.$executeRawUnsafe.mockResolvedValue(1)

    await PATCH(makeReq({ default_fee: 700 }), {
      params: Promise.resolve({ doctorId: DOCTOR_ID }),
    })

    // Only 1 executeRawUnsafe call — the doctor update. No appointment update.
    expect(mockDb.$executeRawUnsafe).toHaveBeenCalledTimes(1)
    expect(mockDb.$executeRawUnsafe.mock.calls[0]?.[0]).toContain('UPDATE')
    expect(mockDb.$executeRawUnsafe.mock.calls[0]?.[0]).toContain('doctors')
  })

  it('returns 403 for RECEPTIONIST', async () => {
    mockAuth.mockResolvedValue(RECEPTIONIST_SESSION)

    const res = await PATCH(makeReq({ default_fee: 500 }), {
      params: Promise.resolve({ doctorId: DOCTOR_ID }),
    })
    expect(res.status).toBe(403)
  })

  it('returns 404 when doctor not found', async () => {
    mockDb.$queryRawUnsafe.mockResolvedValueOnce([])

    const res = await PATCH(makeReq({ default_fee: 500 }), {
      params: Promise.resolve({ doctorId: DOCTOR_ID }),
    })
    expect(res.status).toBe(404)
  })

  it('returns 400 when default_fee exceeds 99999', async () => {
    const res = await PATCH(makeReq({ default_fee: 100000 }), {
      params: Promise.resolve({ doctorId: DOCTOR_ID }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)

    const res = await PATCH(makeReq({ default_fee: 500 }), {
      params: Promise.resolve({ doctorId: DOCTOR_ID }),
    })
    expect(res.status).toBe(401)
  })
})
