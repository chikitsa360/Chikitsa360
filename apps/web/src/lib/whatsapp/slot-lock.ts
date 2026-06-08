import { db } from '@/lib/db'

export interface SlotLockResult {
  locked: boolean
  slotId?: string
}

/**
 * Attempt to lock a slot using SELECT FOR UPDATE SKIP LOCKED (ARCH-9).
 * If already locked by a concurrent transaction, returns { locked: false }.
 * Must be called inside a Prisma $transaction.
 */
export async function tryLockSlot(
  clinicId: string,
  slotId: string
): Promise<SlotLockResult> {
  const schemaName = `clinic_${clinicId}`

  return db.$transaction(async (tx) => {
    // Attempt atomic lock — SKIP LOCKED means no waiting, instant fail on contention
    const rows = await tx.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM "${schemaName}".slots
       WHERE id = $1::uuid AND status = 'available'
       FOR UPDATE SKIP LOCKED`,
      slotId
    )

    if (rows.length === 0) {
      return { locked: false }
    }

    // Mark as reserved within the same transaction
    await tx.$executeRawUnsafe(
      `UPDATE "${schemaName}".slots SET status = 'reserved' WHERE id = $1::uuid`,
      slotId
    )

    const row = rows[0]!
    return { locked: true, slotId: row.id }
  })
}

/**
 * Release a reserved slot back to 'available'.
 * Used by the delayed slot-release Inngest job.
 */
export async function releaseSlot(clinicId: string, slotId: string): Promise<void> {
  const schemaName = `clinic_${clinicId}`
  await db.$executeRawUnsafe(
    `UPDATE "${schemaName}".slots SET status = 'available'
     WHERE id = $1::uuid AND status = 'reserved'`,
    slotId
  )
}

/**
 * Mark a slot as booked (called after appointment is created).
 */
export async function markSlotBooked(clinicId: string, slotId: string): Promise<void> {
  const schemaName = `clinic_${clinicId}`
  await db.$executeRawUnsafe(
    `UPDATE "${schemaName}".slots SET status = 'booked' WHERE id = $1::uuid`,
    slotId
  )
}
