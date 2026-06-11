import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    $queryRawUnsafe: vi.fn(),
    $transaction: vi.fn(),
  },
}))

import { POST } from '../route'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { NextRequest } from 'next/server'

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockDb = db as unknown as {
  $queryRawUnsafe: ReturnType<typeof vi.fn>
  $transaction: ReturnType<typeof vi.fn>
}

const OWNER_SESSION = {
  user: { id: 'user-1', clinicId: 'clinic-1', role: 'OWNER', name: 'Dr. Owner' },
}

const RECEPTIONIST_SESSION = {
  user: { id: 'user-2', clinicId: 'clinic-1', role: 'RECEPTIONIST', name: 'Receptionist' },
}

const PATIENT = { id: 'patient-1', name: 'Ravi Kumar', phone: '9876543210' }

function makeRequest(patientId: string) {
  return new NextRequest(`http://localhost/api/v1/patients/${patientId}/erase`, {
    method: 'POST',
  })
}

function makeParams(patientId: string) {
  return { params: Promise.resolve({ patientId }) }
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('POST /api/v1/patients/[patientId]/erase', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await POST(makeRequest('patient-1'), makeParams('patient-1'))
    expect(res.status).toBe(401)
  })

  it('returns 403 for RECEPTIONIST role', async () => {
    mockAuth.mockResolvedValue(RECEPTIONIST_SESSION)
    const res = await POST(makeRequest('patient-1'), makeParams('patient-1'))
    expect(res.status).toBe(403)
    const data = await res.json() as { error: string }
    expect(data.error).toMatch(/only clinic owners/i)
  })

  it('returns 404 when patient not found in clinic', async () => {
    mockAuth.mockResolvedValue(OWNER_SESSION)
    mockDb.$queryRawUnsafe.mockResolvedValueOnce([]) // patient lookup returns empty
    const res = await POST(makeRequest('patient-1'), makeParams('patient-1'))
    expect(res.status).toBe(404)
  })

  it('runs erasure transaction and returns 200', async () => {
    mockAuth.mockResolvedValue(OWNER_SESSION)
    mockDb.$queryRawUnsafe.mockResolvedValueOnce([PATIENT])

    // Simulate transaction executing the 3 steps
    mockDb.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const mockTx = {
        $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
        $executeRaw: vi.fn().mockResolvedValue(undefined),
      }
      // Mock tagged template literal call
      mockTx.$executeRaw.mockResolvedValue(undefined)
      await fn(mockTx)
    })

    const res = await POST(makeRequest('patient-1'), makeParams('patient-1'))
    expect(res.status).toBe(200)
    const data = await res.json() as { erased: boolean; patientId: string }
    expect(data.erased).toBe(true)
    expect(data.patientId).toBe('patient-1')
  })

  it('transaction executes PII update and visit_notes redaction', async () => {
    mockAuth.mockResolvedValue(OWNER_SESSION)
    mockDb.$queryRawUnsafe.mockResolvedValueOnce([PATIENT])

    const executeRawUnsafe = vi.fn().mockResolvedValue(undefined)
    const executeRaw = vi.fn().mockResolvedValue(undefined)

    mockDb.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn({ $executeRawUnsafe: executeRawUnsafe, $executeRaw: executeRaw })
    })

    await POST(makeRequest('patient-1'), makeParams('patient-1'))

    // First call: PII anonymisation
    expect(executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining("name = 'Deleted Patient'"),
      'patient-1'
    )
    // Second call: visit_notes redaction
    expect(executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining("[deleted per erasure request]"),
      'patient-1'
    )
    // Audit log via tagged template ($executeRaw)
    expect(executeRaw).toHaveBeenCalled()
  })

  it('returns 403 for DOCTOR role', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-3', clinicId: 'clinic-1', role: 'DOCTOR', name: 'Dr. Smith' },
    })
    const res = await POST(makeRequest('patient-1'), makeParams('patient-1'))
    expect(res.status).toBe(403)
  })
})
