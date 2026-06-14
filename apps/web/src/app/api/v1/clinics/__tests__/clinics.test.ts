import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next-auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

// Mock tenant provisioning
vi.mock('@/lib/tenant', () => ({
  provisionClinicSchema: vi.fn().mockResolvedValue(undefined),
}))

// Mock Prisma db
vi.mock('@/lib/db', () => ({
  db: {
    clinic: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
  },
}))

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { GET, POST } from '../route'
import { NextRequest } from 'next/server'

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockDb = db as unknown as {
  clinic: {
    findUnique: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
  user: { update: ReturnType<typeof vi.fn> }
}

function makeRequest(body: unknown, method = 'POST') {
  return new NextRequest('http://localhost/api/v1/clinics', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const VALID_BODY = {
  name: 'City Dental Clinic',
  address: '12 MG Road',
  city: 'Bengaluru',
  speciality: 'Dentistry',
  clinicPhone: '',
  slug: 'city-dental-clinic',
  tosAccepted: true,
  privacyAccepted: true,
  dpaAccepted: true,
}

describe('POST /api/v1/clinics - clinic creation with legal timestamps', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(401)
  })

  it('creates clinic and records legal timestamps', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1', clinicId: null } })
    mockDb.clinic.findUnique.mockResolvedValue(null) // slug available
    mockDb.clinic.create.mockResolvedValue({
      id: 'clinic-1',
      name: 'City Dental Clinic',
      slug: 'city-dental-clinic',
      tosAcceptedAt: new Date(),
      privacyAcceptedAt: new Date(),
      dpaAcceptedAt: new Date(),
    })
    mockDb.user.update.mockResolvedValue({})

    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(201)

    const createCall = mockDb.clinic.create.mock.calls[0]?.[0]
    expect(createCall.data.tosAcceptedAt).toBeInstanceOf(Date)
    expect(createCall.data.privacyAcceptedAt).toBeInstanceOf(Date)
    expect(createCall.data.dpaAcceptedAt).toBeInstanceOf(Date)
    expect(createCall.data.onboardingStep).toBe(2)
  })

  it('returns 400 if legal agreements not accepted', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1', clinicId: null } })
    const res = await POST(makeRequest({ ...VALID_BODY, tosAccepted: false }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/legal/i)
  })

  it('returns 409 with suggestion when slug is taken', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1', clinicId: null } })
    // slug "city-dental-clinic" taken; "city-dental-clinic-2" also taken; "city-dental-clinic-3" free
    mockDb.clinic.findUnique
      .mockResolvedValueOnce({ id: 'other-clinic' })  // slug "city-dental-clinic" taken
      .mockResolvedValueOnce({ id: 'other-clinic-2' }) // suggestion -2 also taken
      .mockResolvedValueOnce(null)                      // suggestion -3 available

    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(409)
    const data = await res.json()
    expect(data.suggestion).toBe('city-dental-clinic-3')
  })

  it('returns 400 for invalid phone format', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1', clinicId: null } })
    const res = await POST(makeRequest({ ...VALID_BODY, clinicPhone: '12345' }))
    expect(res.status).toBe(400)
  })
})

describe('GET /api/v1/clinics', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns clinic data for authenticated owner', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1', clinicId: 'clinic-1' } })
    mockDb.clinic.findUnique.mockResolvedValue({
      id: 'clinic-1',
      name: 'City Dental',
      slug: 'city-dental',
      onboardingStep: 2,
      onboardingComplete: false,
    })

    const res = await GET()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.id).toBe('clinic-1')
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })
})

describe('Onboarding step resume — partial wizard', () => {
  it('marks onboarding_step=2 after step 1 completion', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1', clinicId: null } })
    mockDb.clinic.findUnique.mockResolvedValue(null)
    mockDb.clinic.create.mockResolvedValue({ id: 'c1', onboardingStep: 2 })
    mockDb.user.update.mockResolvedValue({})

    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(201)
    expect(mockDb.clinic.create.mock.calls[0]?.[0]?.data.onboardingStep).toBe(2)
  })
})
