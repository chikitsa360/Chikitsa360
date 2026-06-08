import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    clinic: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $queryRawUnsafe: vi.fn(),
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
  clinic: {
    findUnique: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
  $queryRawUnsafe: ReturnType<typeof vi.fn>
}

const SESSION_OWNER = {
  user: { id: 'user-1', clinicId: 'clinic-1', role: 'OWNER' },
}
const SESSION_DOCTOR = {
  user: { id: 'user-2', clinicId: 'clinic-1', role: 'DOCTOR' },
}

const CLINIC_SETTINGS = {
  reminder24hEnabled: true,
  reminder2hEnabled: true,
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('GET /api/v1/clinics/settings', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns reminder settings + opt-out count', async () => {
    mockAuth.mockResolvedValue(SESSION_OWNER)
    mockDb.clinic.findUnique.mockResolvedValue(CLINIC_SETTINGS)
    mockDb.$queryRawUnsafe.mockResolvedValue([{ count: '3' }])

    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json() as { reminder_24h_enabled: boolean; opt_out_count: number }
    expect(json.reminder_24h_enabled).toBe(true)
    expect(json.opt_out_count).toBe(3)
  })
})

describe('PATCH /api/v1/clinics/settings', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/v1/clinics/settings', {
      method: 'PATCH',
      body: JSON.stringify({ reminder_24h_enabled: false }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-OWNER roles', async () => {
    mockAuth.mockResolvedValue(SESSION_DOCTOR)
    const req = new NextRequest('http://localhost/api/v1/clinics/settings', {
      method: 'PATCH',
      body: JSON.stringify({ reminder_24h_enabled: false }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req)
    expect(res.status).toBe(403)
  })

  it('saves toggle update + returns new settings', async () => {
    mockAuth.mockResolvedValue(SESSION_OWNER)
    mockDb.clinic.findUnique.mockResolvedValue(CLINIC_SETTINGS)
    mockDb.clinic.update.mockResolvedValue({ reminder24hEnabled: false, reminder2hEnabled: true })

    const req = new NextRequest('http://localhost/api/v1/clinics/settings', {
      method: 'PATCH',
      body: JSON.stringify({ reminder_24h_enabled: false }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    const json = await res.json() as { reminder_24h_enabled: boolean }
    expect(json.reminder_24h_enabled).toBe(false)
  })

  it('validates input — rejects non-boolean values', async () => {
    mockAuth.mockResolvedValue(SESSION_OWNER)
    const req = new NextRequest('http://localhost/api/v1/clinics/settings', {
      method: 'PATCH',
      body: JSON.stringify({ reminder_24h_enabled: 'yes' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
  })
})
