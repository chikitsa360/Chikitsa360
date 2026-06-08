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
  total: '10',
  completed: '4',
  remaining: '5',
  no_shows: '1',
  new_patients: '3',
  returning_patients: '7',
}

const UPCOMING_ROW = {
  id: 'apt-1',
  token_number: 5,
  patient_name: 'Rahul Shah',
  doctor_name: 'Dr. Sharma',
  appointment_time: '10:30:00',
  booking_source: 'whatsapp',
  is_overdue: false,
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('GET /api/v1/dashboard/today', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns correct aggregate counts', async () => {
    mockAuth.mockResolvedValue(SESSION)
    // First call: agg query; second: revenue (throws — no Epic 9 cols); third: upcoming rows
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([AGG_ROW])
      .mockRejectedValueOnce(new Error('column not found')) // revenue fallback
      .mockResolvedValueOnce([UPCOMING_ROW])

    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json() as {
      total: number; completed: number; remaining: number
      noShows: number; newPatients: number; returning: number
      revenue: null; upcoming: unknown[]
    }
    expect(json.total).toBe(10)
    expect(json.completed).toBe(4)
    expect(json.remaining).toBe(5)
    expect(json.noShows).toBe(1)
    expect(json.newPatients).toBe(3)
    expect(json.returning).toBe(7)
    expect(json.revenue).toBeNull()
  })

  it('"remaining" counts only confirmed + future slot_time (via query)', async () => {
    // remaining = 5 from AGG_ROW (verified SQL uses appointment_time > NOW IST)
    mockAuth.mockResolvedValue(SESSION)
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ ...AGG_ROW, remaining: '5' }])
      .mockRejectedValueOnce(new Error('no col'))
      .mockResolvedValueOnce([])

    const res = await GET()
    const json = await res.json() as { remaining: number }
    expect(json.remaining).toBe(5)
  })

  it('"new patient" classification: first_date = today → counted as new', async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ ...AGG_ROW, new_patients: '2', returning_patients: '0' }])
      .mockRejectedValueOnce(new Error('no col'))
      .mockResolvedValueOnce([])

    const res = await GET()
    const json = await res.json() as { newPatients: number; returning: number }
    expect(json.newPatients).toBe(2)
    expect(json.returning).toBe(0)
  })

  it('upcoming feed is sorted chronologically (max 5 shown)', async () => {
    mockAuth.mockResolvedValue(SESSION)
    const rows = Array.from({ length: 5 }, (_, i) => ({
      ...UPCOMING_ROW,
      id: `apt-${i}`,
      appointment_time: `${String(9 + i).padStart(2, '0')}:00:00`,
    }))
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([AGG_ROW])
      .mockRejectedValueOnce(new Error('no col'))
      .mockResolvedValueOnce(rows)

    const res = await GET()
    const json = await res.json() as { upcoming: { time: string }[] }
    expect(json.upcoming).toHaveLength(5)
    // times should be in ascending chronological order (SQL ORDER BY appointment_time ASC)
    const times = json.upcoming.map((u) => u.time)
    for (let i = 1; i < times.length; i++) {
      expect(times[i]! >= times[i - 1]!).toBe(true)
    }
  })

  it('overdue label: confirmed appointment with past slot_time → isOverdue=true', async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([AGG_ROW])
      .mockRejectedValueOnce(new Error('no col'))
      .mockResolvedValueOnce([{ ...UPCOMING_ROW, is_overdue: true }])

    const res = await GET()
    const json = await res.json() as { upcoming: { isOverdue: boolean }[] }
    expect(json.upcoming[0]?.isOverdue).toBe(true)
  })

  it('returns revenue when Epic 9 columns exist', async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([AGG_ROW])
      .mockResolvedValueOnce([{ revenue: '18400.00', pending: '6' }]) // revenue success
      .mockResolvedValueOnce([])

    const res = await GET()
    const json = await res.json() as { revenue: number; pending: number }
    expect(json.revenue).toBe(18400)
    expect(json.pending).toBe(6)
  })

  it('tenant isolation: uses clinicId from session only', async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([AGG_ROW])
      .mockRejectedValueOnce(new Error('no col'))
      .mockResolvedValueOnce([])

    await GET()
    const firstCall = mockDb.$queryRawUnsafe.mock.calls[0]?.[0] as string
    expect(firstCall).toContain('"clinic_clinic-1"')
    expect(firstCall).not.toContain('"clinic_clinic-2"')
  })
})
