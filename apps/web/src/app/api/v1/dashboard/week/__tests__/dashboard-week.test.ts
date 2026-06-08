import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/db', () => ({
  db: { $queryRawUnsafe: vi.fn() },
}))

import { GET } from '../route'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>
const mockDb = db as unknown as { $queryRawUnsafe: ReturnType<typeof vi.fn> }

const SESSION = { user: { clinicId: 'clinic-1', name: 'Dr Test', role: 'OWNER' } }

const AGG_ROW = {
  total: '50',
  completed: '30',
  no_shows: '5',
  new_patients: '10',
  returning_patients: '40',
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('GET /api/v1/dashboard/week', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns correct weekly aggregates', async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([AGG_ROW])
      .mockRejectedValueOnce(new Error('no col')) // revenue fallback

    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json() as {
      total: number; completed: number; noShows: number
      noShowPct: string; revenue: null; newPatients: number; returning: number
    }
    expect(json.total).toBe(50)
    expect(json.completed).toBe(30)
    expect(json.noShows).toBe(5)
    expect(json.noShowPct).toBe('10%')
    expect(json.revenue).toBeNull()
    expect(json.newPatients).toBe(10)
    expect(json.returning).toBe(40)
  })

  it('no-show %: shows "—" when total = 0', async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ ...AGG_ROW, total: '0', no_shows: '0' }])
      .mockRejectedValueOnce(new Error('no col'))

    const res = await GET()
    const json = await res.json() as { noShowPct: string }
    expect(json.noShowPct).toBe('—')
  })

  it('revenue sum: only paid appointments; graceful null when Epic 9 absent', async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([AGG_ROW])
      .mockRejectedValueOnce(new Error('column consultation_fee does not exist'))

    const res = await GET()
    const json = await res.json() as { revenue: null }
    expect(json.revenue).toBeNull()
  })

  it('revenue card: returns sum when Epic 9 columns exist', async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([AGG_ROW])
      .mockResolvedValueOnce([{ revenue: '92000.50', pending: '20' }])

    const res = await GET()
    const json = await res.json() as { revenue: number; pending: number }
    expect(json.revenue).toBe(92000.5)
    expect(json.pending).toBe(20)
  })

  it('uses Mon–Sun IST week boundary in SQL', async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([AGG_ROW])
      .mockRejectedValueOnce(new Error('no col'))

    await GET()
    const sql = mockDb.$queryRawUnsafe.mock.calls[0]?.[0] as string
    expect(sql).toContain("date_trunc('week'")
    expect(sql).toContain("'Asia/Kolkata'")
    expect(sql).toContain('interval \'6 days\'')
  })
})
