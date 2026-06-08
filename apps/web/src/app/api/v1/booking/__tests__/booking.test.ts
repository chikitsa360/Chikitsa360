import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    clinic: {
      findUnique: vi.fn(),
    },
    $queryRawUnsafe: vi.fn(),
    $executeRawUnsafe: vi.fn(),
  },
}))

vi.mock('@/lib/notifications/send-confirmation', () => ({
  scheduleConfirmation: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/notifications/schedule-reminders', () => ({
  scheduleReminders: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/pusher', () => ({
  pusherServer: {
    trigger: vi.fn().mockResolvedValue(undefined),
  },
  clinicChannel: (id: string) => `clinic-${id}`,
}))

import { POST } from '../route'
import { db } from '@/lib/db'
import { NextRequest } from 'next/server'

const mockDb = db as unknown as {
  clinic: { findUnique: ReturnType<typeof vi.fn> }
  $queryRawUnsafe: ReturnType<typeof vi.fn>
  $executeRawUnsafe: ReturnType<typeof vi.fn>
}

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/v1/booking', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const VALID_BODY = {
  clinicSlug: 'rao-medical',
  doctorId: '11111111-1111-1111-1111-111111111111',
  date: '2026-06-10',
  startTime: '10:00',
  patientName: 'Ravi Kumar',
  patientPhone: '9876543210',
}

const ACTIVE_CLINIC = {
  id: 'clinic-abc',
  trialEndsAt: null,
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('POST /api/v1/booking - web booking creation', () => {
  it('creates appointment for a new patient', async () => {
    mockDb.clinic.findUnique.mockResolvedValue(ACTIVE_CLINIC)

    // Doctor lookup
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ id: VALID_BODY.doctorId, name: 'Dr. Sharma' }])
      // No existing patient
      .mockResolvedValueOnce([])
      // Create patient → return id
      .mockResolvedValueOnce([{ id: 'patient-1' }])
      // Token count
      .mockResolvedValueOnce([{ max_token: 3 }])
      // Create appointment
      .mockResolvedValueOnce([{ id: 'appt-1' }])

    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(201)
    const data = await res.json() as { tokenNumber: number; appointmentId: string }
    expect(data.tokenNumber).toBe(4)
    expect(data.appointmentId).toBe('appt-1')
  })

  it('reuses existing patient by phone (de-duplication)', async () => {
    mockDb.clinic.findUnique.mockResolvedValue(ACTIVE_CLINIC)

    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ id: VALID_BODY.doctorId, name: 'Dr. Sharma' }])
      // Existing patient found
      .mockResolvedValueOnce([{ id: 'existing-patient' }])
      // Token count
      .mockResolvedValueOnce([{ max_token: 0 }])
      // Create appointment
      .mockResolvedValueOnce([{ id: 'appt-2' }])

    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(201)

    // Verify only 4 DB queries — no patient creation INSERT
    const calls = mockDb.$queryRawUnsafe.mock.calls
    const insertPatientCall = calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes("INSERT INTO") && (c[0] as string).includes("patients")
    )
    expect(insertPatientCall).toBeUndefined()
  })

  it('assigns token_number = MAX(today tokens) + 1', async () => {
    mockDb.clinic.findUnique.mockResolvedValue(ACTIVE_CLINIC)

    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ id: VALID_BODY.doctorId, name: 'Dr. Rao' }])
      .mockResolvedValueOnce([{ id: 'existing-patient' }])
      .mockResolvedValueOnce([{ max_token: 10 }])
      .mockResolvedValueOnce([{ id: 'appt-3' }])

    const res = await POST(makeRequest(VALID_BODY))
    const data = await res.json() as { tokenNumber: number }
    expect(data.tokenNumber).toBe(11)
  })

  it('returns 409 SLOT_TAKEN on unique constraint violation', async () => {
    mockDb.clinic.findUnique.mockResolvedValue(ACTIVE_CLINIC)

    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ id: VALID_BODY.doctorId, name: 'Dr. Sharma' }])
      .mockResolvedValueOnce([{ id: 'patient-1' }])
      .mockResolvedValueOnce([{ max_token: 2 }])
      // Simulate unique constraint violation
      .mockRejectedValueOnce(Object.assign(new Error('unique constraint'), { code: '23505' }))

    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(409)
    const data = await res.json() as { error: string }
    expect(data.error).toBe('SLOT_TAKEN')
  })

  it('returns 403 when plan is expired (soft paywall)', async () => {
    const expiredDate = new Date(Date.now() - 86400000) // yesterday
    mockDb.clinic.findUnique.mockResolvedValue({
      id: 'clinic-abc',
      trialEndsAt: expiredDate,
    })

    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(403)
  })

  it('returns 404 when clinic not found', async () => {
    mockDb.clinic.findUnique.mockResolvedValue(null)
    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(404)
  })

  it('returns 400 for invalid phone number', async () => {
    const res = await POST(
      makeRequest({ ...VALID_BODY, patientPhone: '1234567890' }) // starts with 1 — invalid
    )
    expect(res.status).toBe(400)
  })

  it('returns 400 for missing patient name', async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, patientName: '' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid date format', async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, date: '10-06-2026' }))
    expect(res.status).toBe(400)
  })
})

describe('POST /api/v1/booking - slot race condition handling', () => {
  it('correctly handles unique constraint error string match', async () => {
    mockDb.clinic.findUnique.mockResolvedValue(ACTIVE_CLINIC)

    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ id: VALID_BODY.doctorId, name: 'Dr. Sharma' }])
      .mockResolvedValueOnce([{ id: 'patient-1' }])
      .mockResolvedValueOnce([{ max_token: 5 }])
      .mockRejectedValueOnce(new Error('unique constraint violation'))

    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(409)
  })
})
