import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/v1/clinics/by-slug/[slug]
 * Public endpoint — returns limited clinic info for the web booking page.
 * No auth required. Rate-limited at the Upstash level per slug.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: 'Invalid slug' }, { status: 400 })
  }

  const clinic = await db.clinic.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      speciality: true,
      address: true,
      city: true,
      clinicPhone: true,
      plan: true,
      trialEndsAt: true,
      whatsappConnected: true,
      whatsappPhoneNumberId: true,
    },
  })

  if (!clinic) {
    return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })
  }

  // Soft paywall check (MON-3)
  const isPlanExpired =
    clinic.trialEndsAt !== null && clinic.trialEndsAt < new Date()

  return NextResponse.json({
    id: clinic.id,
    name: clinic.name,
    slug: clinic.slug,
    speciality: clinic.speciality,
    address: clinic.address,
    city: clinic.city,
    clinicPhone: clinic.clinicPhone,
    isPlanExpired,
    whatsappConnected: clinic.whatsappConnected,
  })
}
