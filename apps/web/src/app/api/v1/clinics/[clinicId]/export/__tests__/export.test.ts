import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/db', () => ({
  db: {
    exportJob: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    clinic: {
      findUnique: vi.fn(),
    },
  },
}))
vi.mock('@/lib/inngest', () => ({ inngest: { send: vi.fn().mockResolvedValue(undefined) } }))
vi.mock('@/lib/audit', () => ({ writeAuditLog: vi.fn().mockResolvedValue(undefined) }))

import { POST, GET } from '../route'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { NextRequest } from 'next/server'

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockDb = db as unknown as {
  exportJob: { create: ReturnType<typeof vi.fn>; findFirst: ReturnType<typeof vi.fn> }
  clinic: { findUnique: ReturnType<typeof vi.fn> }
}

const OWNER = {
  user: { id: 'user-1', clinicId: 'clinic-1', role: 'OWNER', systemRole: null },
}

function makePostReq(clinicId: string) {
  return new NextRequest(`http://localhost/api/v1/clinics/${clinicId}/export`, { method: 'POST' })
}

function makeGetReq(clinicId: string, jobId?: string) {
  const url = new URL(`http://localhost/api/v1/clinics/${clinicId}/export/download`)
  if (jobId) url.searchParams.set('jobId', jobId)
  return new NextRequest(url.toString())
}

function makeParams(clinicId: string) {
  return { params: Promise.resolve({ clinicId }) }
}

beforeEach(() => { vi.resetAllMocks() })

describe('POST /api/v1/clinics/[clinicId]/export', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await POST(makePostReq('clinic-1'), makeParams('clinic-1'))
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-owner', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'u-1', clinicId: 'clinic-1', role: 'RECEPTIONIST', systemRole: null },
    })
    const res = await POST(makePostReq('clinic-1'), makeParams('clinic-1'))
    expect(res.status).toBe(403)
  })

  it('returns 403 when clinicId param differs from session', async () => {
    mockAuth.mockResolvedValue(OWNER)
    const res = await POST(makePostReq('other-clinic'), makeParams('other-clinic'))
    expect(res.status).toBe(403)
  })

  it('creates export job and returns 202', async () => {
    mockAuth.mockResolvedValue(OWNER)
    mockDb.exportJob.create.mockResolvedValue({ id: 'job-1', status: 'pending' })

    const res = await POST(makePostReq('clinic-1'), makeParams('clinic-1'))
    expect(res.status).toBe(202)
    const data = await res.json() as { jobId: string; status: string }
    expect(data.jobId).toBe('job-1')
    expect(data.status).toBe('pending')
  })
})

describe('GET /api/v1/clinics/[clinicId]/export/download', () => {
  it('returns 202 for pending job', async () => {
    mockAuth.mockResolvedValue(OWNER)
    mockDb.exportJob.findFirst.mockResolvedValue({ id: 'job-1', status: 'pending', expiresAt: new Date(Date.now() + 3600000) })

    const res = await GET(makeGetReq('clinic-1', 'job-1'), makeParams('clinic-1'))
    expect(res.status).toBe(202)
  })

  it('returns 410 for expired job', async () => {
    mockAuth.mockResolvedValue(OWNER)
    mockDb.exportJob.findFirst.mockResolvedValue({
      id: 'job-1',
      status: 'complete',
      expiresAt: new Date(Date.now() - 3600000),
      csvData: 'someBase64',
    })

    const res = await GET(makeGetReq('clinic-1', 'job-1'), makeParams('clinic-1'))
    expect(res.status).toBe(410)
  })

  it('returns ZIP buffer for complete job', async () => {
    mockAuth.mockResolvedValue(OWNER)
    const fakeZip = Buffer.from('PK\x03\x04') // ZIP magic bytes
    mockDb.exportJob.findFirst.mockResolvedValue({
      id: 'job-1',
      status: 'complete',
      expiresAt: new Date(Date.now() + 3600000),
      csvData: fakeZip.toString('base64'),
    })
    mockDb.clinic.findUnique.mockResolvedValue({ slug: 'test-clinic' })

    const res = await GET(makeGetReq('clinic-1', 'job-1'), makeParams('clinic-1'))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/zip')
    expect(res.headers.get('Content-Disposition')).toContain('.zip')
  })
})
