import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
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
  pusherServer: { trigger: vi.fn().mockResolvedValue(undefined) },
  clinicChannel: (id: string) => `clinic-${id}`,
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

const SESSION = {
  user: {
    id: 'user-1',
    clinicId: 'clinic-1',
    role: 'RECEPTIONIST',
  },
}

const DOCTOR_ID = '11111111-1111-1111-1111-111111111111'
const PATIENT_ID = '22222222-2222-2222-2222-222222222222'

beforeEach(() => {
  vi.resetAllMocks()
  mockAuth.mockResolvedValue(SESSION)
})

// ─── GET /api/v1/appointments ─────────────────────────────────────────────────

describe('GET /api/v1/appointments', () => {
  it('returns appointments for a date', async () => {
    const mockAppointments = [
      {
        id: 'appt-1',
        patient_name: 'Ravi Kumar',
        patient_phone: '9876543210',
        doctor_id: DOCTOR_ID,
        doctor_name: 'Dr. Sharma',
        status: 'confirmed',
        token_number: 1,
        booking_source: 'manual',
        appointment_date: '2026-06-10',
        appointment_time: '09:00',
      },
    ]
    mockDb.$queryRawUnsafe.mockResolvedValueOnce(mockAppointments)

    const req = new NextRequest('http://localhost/api/v1/appointments?date=2026-06-10')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json() as { appointments: typeof mockAppointments }
    expect(data.appointments).toHaveLength(1)
    expect(data.appointments[0]?.patient_name).toBe('Ravi Kumar')
  })

  it('returns week density counts when startDate and endDate provided', async () => {
    const mockCounts = [
      { appointment_date: '2026-06-08', doctor_id: DOCTOR_ID, doctor_name: 'Dr. Sharma', count: '3' },
    ]
    mockDb.$queryRawUnsafe.mockResolvedValueOnce(mockCounts)

    const req = new NextRequest('http://localhost/api/v1/appointments?startDate=2026-06-08&endDate=2026-06-14')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json() as { counts: typeof mockCounts }
    expect(data.counts[0]?.count).toBe('3')
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/v1/appointments?date=2026-06-10')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 when date parameter is missing', async () => {
    const req = new NextRequest('http://localhost/api/v1/appointments')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })
})

// ─── POST /api/v1/appointments ────────────────────────────────────────────────

describe('POST /api/v1/appointments - manual booking', () => {
  function makeRequest(body: unknown) {
    return new NextRequest('http://localhost/api/v1/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  const VALID_BODY = {
    doctorId: DOCTOR_ID,
    date: '2026-06-10',
    startTime: '09:00',
    bookingSource: 'manual',
    newPatient: { name: 'Ravi Kumar', phone: '9876543210' },
  }

  it('creates appointment for a new patient', async () => {
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ id: DOCTOR_ID, name: 'Dr. Sharma' }]) // doctor lookup
      .mockResolvedValueOnce([]) // no existing patient
      .mockResolvedValueOnce([{ id: 'patient-1' }]) // create patient
      .mockResolvedValueOnce([{ max_token: 4 }]) // token count
      .mockResolvedValueOnce([{ id: 'appt-1', token_number: 5 }]) // create appointment
    mockDb.$executeRawUnsafe.mockResolvedValue(undefined)

    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(201)
    const data = await res.json() as { tokenNumber: number; bookingSource: string }
    expect(data.bookingSource).toBe('manual')
    expect(data.tokenNumber).toBe(5)
  })

  it('reuses existing patient (no duplicate created — FR-20)', async () => {
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ id: DOCTOR_ID, name: 'Dr. Sharma' }])
      .mockResolvedValueOnce([{ id: 'existing-patient-1' }]) // phone match found
      .mockResolvedValueOnce([{ max_token: 1 }])
      .mockResolvedValueOnce([{ id: 'appt-2', token_number: 2 }])
    mockDb.$executeRawUnsafe.mockResolvedValue(undefined)

    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(201)

    // Verify no INSERT into patients was made
    const insertPatientCall = mockDb.$queryRawUnsafe.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT') && (c[0] as string).includes('patients')
    )
    expect(insertPatientCall).toBeUndefined()
  })

  it('creates walk-in appointment with booking_source=walk-in', async () => {
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ id: DOCTOR_ID, name: 'Dr. Sharma' }])
      .mockResolvedValueOnce([{ id: 'patient-1' }])
      .mockResolvedValueOnce([{ max_token: 2 }])
      .mockResolvedValueOnce([{ id: 'appt-3', token_number: 3 }])
    mockDb.$executeRawUnsafe.mockResolvedValue(undefined)

    const walkInBody = { ...VALID_BODY, bookingSource: 'walk-in', patientId: PATIENT_ID, newPatient: undefined }
    const res = await POST(makeRequest(walkInBody))
    expect(res.status).toBe(201)
    const data = await res.json() as { bookingSource: string }
    expect(data.bookingSource).toBe('walk-in')
  })

  it('returns 409 SLOT_TAKEN on concurrent booking', async () => {
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ id: DOCTOR_ID, name: 'Dr. Sharma' }])
      .mockResolvedValueOnce([{ id: 'patient-1' }])
      .mockResolvedValueOnce([{ max_token: 0 }])
      .mockRejectedValueOnce(Object.assign(new Error('unique constraint'), { code: '23505' }))

    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(409)
    const data = await res.json() as { error: string }
    expect(data.error).toBe('SLOT_TAKEN')
  })

  it('returns 404 when doctor not found in tenant', async () => {
    mockDb.$queryRawUnsafe.mockResolvedValueOnce([]) // no doctor
    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(404)
  })

  it('returns 400 when neither patientId nor newPatient provided', async () => {
    const body = { doctorId: DOCTOR_ID, date: '2026-06-10', startTime: '09:00', bookingSource: 'manual' }
    const res = await POST(makeRequest(body))
    expect(res.status).toBe(400)
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(401)
  })
})

// ─── Patient name validation ───────────────────────────────────────────────────
describe('patient name validation', () => {
  function validateName(value: string): string {
    if (!value.trim()) return 'Name is required.'
    if (!/\p{L}/u.test(value.trim())) return 'Please enter a valid patient name.'
    return ''
  }

  it('accepts regular names', () => {
    expect(validateName('Ravi Kumar')).toBe('')
  })

  it('accepts Unicode/Devanagari names', () => {
    expect(validateName('राम कुमार')).toBe('')
  })

  it('rejects digit-only names', () => {
    expect(validateName('12345')).toMatch(/valid/)
  })

  it('rejects special-character-only names', () => {
    expect(validateName('***')).toMatch(/valid/)
  })

  it('rejects empty names', () => {
    expect(validateName('')).toMatch(/required/)
  })
})
