import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { computeAvailableSlots } from '@/lib/compute-available-slots'

/**
 * GET /api/v1/slots/next-available?doctorId={id}&fromTime={HH:mm}
 * Authenticated. Returns the next available slot for a doctor from the current time onwards (today).
 * Used by Walk-In Registration panel (Story 5.3).
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const clinicId = session.user.clinicId
  const doctorId = req.nextUrl.searchParams.get('doctorId') ?? undefined
  const fromTime = req.nextUrl.searchParams.get('fromTime') ?? undefined

  // Compute today's available slots
  const today = new Date()
  const fromDate = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  )

  const slots = await computeAvailableSlots(clinicId, fromDate, 1, doctorId)

  if (slots.length === 0) {
    return NextResponse.json({ slot: null, fullyBooked: true })
  }

  // Filter to slots at or after fromTime (if provided)
  let available = slots
  if (fromTime) {
    available = slots.filter((s) => s.startTime >= fromTime)
  }

  const nextSlot = available[0] ?? null

  return NextResponse.json({
    slot: nextSlot,
    fullyBooked: nextSlot === null,
    totalAvailable: available.length,
  })
}
