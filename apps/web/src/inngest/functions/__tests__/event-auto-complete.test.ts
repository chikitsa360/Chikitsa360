import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    clinic: { findMany: vi.fn() },
    $queryRawUnsafe: vi.fn(),
    $executeRawUnsafe: vi.fn(),
  },
}))

vi.mock('@/lib/inngest', () => ({
  inngest: { createFunction: vi.fn() },
}))

import { db } from '@/lib/db'
import { inngest } from '@/lib/inngest'

const mockDb = db as unknown as {
  clinic: { findMany: ReturnType<typeof vi.fn> }
  $queryRawUnsafe: ReturnType<typeof vi.fn>
  $executeRawUnsafe: ReturnType<typeof vi.fn>
}

let capturedHandler: (ctx: {
  step: { run: <T>(id: string, fn: () => Promise<T>) => Promise<T> }
}) => Promise<unknown>

;(inngest.createFunction as ReturnType<typeof vi.fn>).mockImplementation(
  (_opts: unknown, _trigger: unknown, handler: typeof capturedHandler) => { capturedHandler = handler }
)

await import('../event-auto-complete')

const makeStep = () => ({
  run: async <T>(_id: string, fn: () => Promise<T>) => fn(),
})

beforeEach(() => {
  vi.resetAllMocks()
  ;(inngest.createFunction as ReturnType<typeof vi.fn>).mockImplementation(() => {})
  mockDb.$executeRawUnsafe.mockResolvedValue(undefined)
})

describe('eventAutoComplete cron handler', () => {
  it('returns 0 completed when no clinics exist', async () => {
    mockDb.clinic.findMany.mockResolvedValue([])
    const result = await capturedHandler({ step: makeStep() })
    expect(result).toMatchObject({ completed: 0, clinics: 0 })
    expect(mockDb.$queryRawUnsafe).not.toHaveBeenCalled()
  })

  it('auto-completes published events 24h past end_time', async () => {
    mockDb.clinic.findMany.mockResolvedValue([{ id: 'clinic-1' }, { id: 'clinic-2' }])
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([{ id: 'event-1' }, { id: 'event-2' }]) // clinic-1: 2 events completed
      .mockResolvedValueOnce([])  // clinic-2: no events to complete

    const result = await capturedHandler({ step: makeStep() })
    expect(result).toMatchObject({ completed: 2, clinics: 2 })
    expect(mockDb.$queryRawUnsafe).toHaveBeenCalledTimes(2)
    expect(mockDb.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining("status = 'completed'"),
      // no extra args (the raw UPDATE)
    )
  })

  it('writes audit log for each completed event', async () => {
    mockDb.clinic.findMany.mockResolvedValue([{ id: 'clinic-1' }])
    mockDb.$queryRawUnsafe.mockResolvedValue([{ id: 'event-abc' }])

    await capturedHandler({ step: makeStep() })
    expect(mockDb.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('EVENT_AUTO_COMPLETED'),
      'clinic-1',
      'event-abc'
    )
  })

  it('does not fail if audit log write throws', async () => {
    mockDb.clinic.findMany.mockResolvedValue([{ id: 'clinic-1' }])
    mockDb.$queryRawUnsafe.mockResolvedValue([{ id: 'event-1' }])
    mockDb.$executeRawUnsafe.mockRejectedValue(new Error('audit write failed'))

    // Should not throw
    const result = await capturedHandler({ step: makeStep() })
    expect(result).toMatchObject({ completed: 1 })
  })
})
