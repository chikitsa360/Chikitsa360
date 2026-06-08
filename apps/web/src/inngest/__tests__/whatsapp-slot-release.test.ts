import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockQueryRawUnsafe = vi.fn()
const mockExecuteRawUnsafe = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    $queryRawUnsafe: mockQueryRawUnsafe,
    $executeRawUnsafe: mockExecuteRawUnsafe,
  },
}))

// We test the slot release logic directly
const checkAndRelease = async (clinicId: string, slotId: string) => {
  const { db } = await import('@/lib/db')
  const schemaName = `clinic_${clinicId}`

  const appointments = await db.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM "${schemaName}".appointments WHERE slot_id = $1::uuid LIMIT 1`,
    slotId
  )

  if (appointments.length > 0) {
    return { released: false, reason: 'appointment_exists' }
  }

  await db.$executeRawUnsafe(
    `UPDATE "${schemaName}".slots SET status = 'available'
     WHERE id = $1::uuid AND status = 'reserved'`,
    slotId
  )

  return { released: true }
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('whatsapp slot release logic', () => {
  it('does NOT release slot when appointment exists', async () => {
    mockQueryRawUnsafe.mockResolvedValueOnce([{ id: 'apt-1' }])

    const result = await checkAndRelease('clinic-123', 'slot-abc')

    expect(result).toEqual({ released: false, reason: 'appointment_exists' })
    expect(mockExecuteRawUnsafe).not.toHaveBeenCalled()
  })

  it('releases slot when no appointment exists', async () => {
    mockQueryRawUnsafe.mockResolvedValueOnce([])
    mockExecuteRawUnsafe.mockResolvedValueOnce(undefined)

    const result = await checkAndRelease('clinic-123', 'slot-abc')

    expect(result).toEqual({ released: true })
    expect(mockExecuteRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining("SET status = 'available'"),
      'slot-abc'
    )
  })
})
