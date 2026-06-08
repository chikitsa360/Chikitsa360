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
vi.mock('@/lib/pusher', () => ({
  pusherServer: { trigger: vi.fn().mockResolvedValue(undefined) },
  clinicChannel: (id: string) => `clinic-${id}`,
}))

import { PATCH } from '../route'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { pusherServer } from '@/lib/pusher'
import { NextRequest } from 'next/server'

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>
const mockDb = db as unknown as {
  $queryRawUnsafe: ReturnType<typeof vi.fn>
  $executeRawUnsafe: ReturnType<typeof vi.fn>
}
const mockPusher = pusherServer as unknown as { trigger: ReturnType<typeof vi.fn> }

const APPT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const RECEPTIONIST_SESSION = { user: { id: 'user-rec', clinicId: 'clinic-1', role: 'RECEPTIONIST' } }
const OWNER_SESSION = { user: { id: 'user-own', clinicId: 'clinic-1', role: 'OWNER' } }
const DOCTOR_SESSION = { user: { id: 'user-doc', clinicId: 'clinic-1', role: 'DOCTOR' } }

function mockConfirmedAppt(overrides: object = {}) {
  return [{ id: APPT_ID, status: 'confirmed', consultation_fee: null, payment_status: 'unpaid', ...overrides }]
}

function makeReq(body: object) {
  return new NextRequest(`http://localhost/api/v1/appointments/${APPT_ID}/billing`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  mockAuth.mockResolvedValue(RECEPTIONIST_SESSION)
})

describe('PATCH /api/v1/appointments/[id]/billing', () => {
  it('saves fee and paid status — returns 200 with toast', async () => {
    mockDb.$queryRawUnsafe.mockResolvedValueOnce(mockConfirmedAppt())
    mockDb.$executeRawUnsafe.mockResolvedValue(1)

    const res = await PATCH(makeReq({ consultation_fee: 500, payment_status: 'paid' }), {
      params: Promise.resolve({ id: APPT_ID }),
    })
    expect(res.status).toBe(200)
    const data = await res.json() as { ok: boolean; consultation_fee: number; payment_status: string; toast: string }
    expect(data.ok).toBe(true)
    expect(data.consultation_fee).toBe(500)
    expect(data.payment_status).toBe('paid')
    expect(data.toast).toContain('₹500 paid')
  })

  it('saves fee with unpaid status', async () => {
    mockDb.$queryRawUnsafe.mockResolvedValueOnce(mockConfirmedAppt())
    mockDb.$executeRawUnsafe.mockResolvedValue(1)

    const res = await PATCH(makeReq({ consultation_fee: 300, payment_status: 'unpaid' }), {
      params: Promise.resolve({ id: APPT_ID }),
    })
    expect(res.status).toBe(200)
    const data = await res.json() as { payment_status: string }
    expect(data.payment_status).toBe('unpaid')
  })

  it('publishes Pusher appointment.payment_updated event', async () => {
    mockDb.$queryRawUnsafe.mockResolvedValueOnce(mockConfirmedAppt())
    mockDb.$executeRawUnsafe.mockResolvedValue(1)

    await PATCH(makeReq({ consultation_fee: 500, payment_status: 'paid' }), {
      params: Promise.resolve({ id: APPT_ID }),
    })

    expect(mockPusher.trigger).toHaveBeenCalledWith(
      'clinic-clinic-1',
      'appointment.payment_updated',
      expect.objectContaining({ consultation_fee: 500, payment_status: 'paid' })
    )
  })

  it('auto-reverts to unpaid when fee is cleared (null + paid → unpaid)', async () => {
    mockDb.$queryRawUnsafe.mockResolvedValueOnce(mockConfirmedAppt({ consultation_fee: '500', payment_status: 'paid' }))
    mockDb.$executeRawUnsafe.mockResolvedValue(1)

    const res = await PATCH(makeReq({ consultation_fee: null, payment_status: 'paid' }), {
      params: Promise.resolve({ id: APPT_ID }),
    })
    expect(res.status).toBe(200)
    const data = await res.json() as { consultation_fee: null; payment_status: string }
    expect(data.consultation_fee).toBeNull()
    expect(data.payment_status).toBe('unpaid')
  })

  it('returns 403 for DOCTOR role', async () => {
    mockAuth.mockResolvedValue(DOCTOR_SESSION)

    const res = await PATCH(makeReq({ consultation_fee: 500, payment_status: 'paid' }), {
      params: Promise.resolve({ id: APPT_ID }),
    })
    expect(res.status).toBe(403)
  })

  it('returns 200 for OWNER role', async () => {
    mockAuth.mockResolvedValue(OWNER_SESSION)
    mockDb.$queryRawUnsafe.mockResolvedValueOnce(mockConfirmedAppt())
    mockDb.$executeRawUnsafe.mockResolvedValue(1)

    const res = await PATCH(makeReq({ consultation_fee: 200, payment_status: 'unpaid' }), {
      params: Promise.resolve({ id: APPT_ID }),
    })
    expect(res.status).toBe(200)
  })

  it('returns 422 for cancelled appointment', async () => {
    mockDb.$queryRawUnsafe.mockResolvedValueOnce(mockConfirmedAppt({ status: 'cancelled' }))

    const res = await PATCH(makeReq({ consultation_fee: 500, payment_status: 'paid' }), {
      params: Promise.resolve({ id: APPT_ID }),
    })
    expect(res.status).toBe(422)
  })

  it('returns 404 for cross-clinic appointment (not found)', async () => {
    mockDb.$queryRawUnsafe.mockResolvedValueOnce([])

    const res = await PATCH(makeReq({ consultation_fee: 500, payment_status: 'paid' }), {
      params: Promise.resolve({ id: APPT_ID }),
    })
    expect(res.status).toBe(404)
  })

  it('returns 400 for fee exceeding max 99999', async () => {
    const res = await PATCH(makeReq({ consultation_fee: 100000, payment_status: 'paid' }), {
      params: Promise.resolve({ id: APPT_ID }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)

    const res = await PATCH(makeReq({ consultation_fee: 500, payment_status: 'paid' }), {
      params: Promise.resolve({ id: APPT_ID }),
    })
    expect(res.status).toBe(401)
  })
})
