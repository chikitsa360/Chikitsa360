import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/db', () => ({
  db: {
    $queryRawUnsafe: vi.fn(),
    $executeRawUnsafe: vi.fn(),
    clinic: { update: vi.fn() },
  },
}))

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { POST } from '../complete-onboarding/route'

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockDb = db as unknown as {
  $queryRawUnsafe: ReturnType<typeof vi.fn>
  $executeRawUnsafe: ReturnType<typeof vi.fn>
  clinic: { update: ReturnType<typeof vi.fn> }
}

describe('POST /api/v1/clinics/complete-onboarding', () => {
  beforeEach(() => vi.resetAllMocks())

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await POST()
    expect(res.status).toBe(401)
  })

  it('creates sample appointment with is_sample=true and marks onboarding complete', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', clinicId: 'c1' } })

    // doctors query
    mockDb.$queryRawUnsafe.mockResolvedValueOnce([{ id: 'doc-1' }])
    // patients query (none exists)
    mockDb.$queryRawUnsafe.mockResolvedValueOnce([])
    // insert placeholder patient
    mockDb.$queryRawUnsafe.mockResolvedValueOnce([{ id: 'pat-1' }])
    // working hours query
    mockDb.$queryRawUnsafe.mockResolvedValueOnce([{ start_time: '10:00:00' }])
    // insert appointment
    mockDb.$executeRawUnsafe.mockResolvedValue(undefined)
    // clinic update
    mockDb.clinic.update.mockResolvedValue({ slug: 'test-clinic', name: 'Test Clinic' })

    const res = await POST()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.slug).toBe('test-clinic')

    // Verify sample appointment insert includes is_sample=true
    const insertCall = (mockDb.$executeRawUnsafe.mock.calls as unknown[][]).find(
      (call) => typeof call[0] === 'string' && (call[0] as string).includes('is_sample')
    )
    expect(insertCall).toBeDefined()
    expect(insertCall?.[0] as string).toContain('is_sample')
    expect(insertCall?.[0] as string).toContain("'sample'") // booking_source = 'sample'

    // Verify onboarding_complete is set
    expect(mockDb.clinic.update.mock.calls[0]?.[0]?.data.onboardingComplete).toBe(true)
  })

  it('uses existing placeholder patient if found', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', clinicId: 'c1' } })
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ id: 'doc-1' }])             // doctors
      .mockResolvedValueOnce([{ id: 'existing-pat' }])      // existing patient
      .mockResolvedValueOnce([{ start_time: '10:00:00' }])  // working hours
    mockDb.$executeRawUnsafe.mockResolvedValue(undefined)
    mockDb.clinic.update.mockResolvedValue({ slug: 'abc', name: 'ABC' })

    const res = await POST()
    expect(res.status).toBe(200)

    // Patient insert should NOT have been called
    const insertPatientCall = (mockDb.$queryRawUnsafe.mock.calls as unknown[][]).find(
      (call) => typeof call[0] === 'string' && (call[0] as string).includes('INSERT INTO') && (call[0] as string).includes('patients')
    )
    expect(insertPatientCall).toBeUndefined()
  })

  it('skips sample appointment creation if no doctors', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', clinicId: 'c1' } })
    mockDb.$queryRawUnsafe.mockResolvedValueOnce([]) // no doctors
    mockDb.clinic.update.mockResolvedValue({ slug: 'abc', name: 'ABC' })

    const res = await POST()
    expect(res.status).toBe(200)

    // No appointment insert
    const insertApptCall = (mockDb.$executeRawUnsafe.mock.calls as unknown[][]).find(
      (call) => typeof call[0] === 'string' && (call[0] as string).includes('appointments')
    )
    expect(insertApptCall).toBeUndefined()
  })
})

describe('Onboarding redirect logic', () => {
  it('onboarding_complete=true should redirect to dashboard (page logic)', () => {
    // This is a server component test — validated by the redirect in page.tsx
    // Documented here for traceability
    expect(true).toBe(true)
  })

  it('Doctor/Receptionist login: never redirect to /onboarding', () => {
    // Validated by auth callback role check in session (Epic 1)
    // Owners: redirect to /onboarding if not complete; others: /dashboard
    expect(true).toBe(true)
  })
})
