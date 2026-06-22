import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { computeAvailableSlots } from '@/lib/compute-available-slots'
import { isPlanExpired } from '@/lib/plan/check-plan'

/**
 * GET /api/v1/slots/available?slug=<slug>&doctorId=<doctorId>&days=7
 * Public endpoint — no auth required. Returns available slots for the next N days.
 * Always computed fresh from working_hours + appointments.
 */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')
  const clinicIdParam = req.nextUrl.searchParams.get('clinicId')
  const doctorId = req.nextUrl.searchParams.get('doctorId') ?? undefined
  const daysParam = req.nextUrl.searchParams.get('days')
  const days = daysParam ? Math.min(Math.max(1, parseInt(daysParam, 10)), 30) : 7

  let resolvedClinicId: string
  let paywall = false

  if (clinicIdParam) {
    // Internal portal usage: clinicId provided directly (authenticated)
    resolvedClinicId = clinicIdParam
  } else {
    // Public usage: resolve clinic via slug
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json({ error: 'slug or clinicId required' }, { status: 400 })
    }

    const clinic = await db.clinic.findUnique({
      where: { slug },
      select: { id: true, planExpiresAt: true },
    })

    if (!clinic) {
      return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })
    }

    // Soft paywall — return empty if plan expired
    if (isPlanExpired(clinic.planExpiresAt)) {
      return NextResponse.json({ slots: [], planExpired: true })
    }

    resolvedClinicId = clinic.id
    paywall = false
  }

  // Compute slots starting from today in IST (UTC+5:30)
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
  const nowIST = new Date(Date.now() + IST_OFFSET_MS)
  const fromDate = new Date(
    Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), nowIST.getUTCDate())
  )

  const slots = await computeAvailableSlots(resolvedClinicId, fromDate, days, doctorId)

  return NextResponse.json({ slots, ...(paywall ? { planExpired: true } : {}) })
}
