import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { generateSlug } from '@/lib/slug'
import { z } from 'zod'

const clinicUpsertSchema = z.object({
  name: z.string().min(1).max(100),
  address: z.string().min(1).max(200),
  city: z.string().min(1).max(50),
  speciality: z.enum([
    'General Medicine',
    'Dermatology',
    'Dentistry',
    'Orthopaedics',
    'Gynaecology',
    'Paediatrics',
    'Ophthalmology',
    'ENT',
    'Other',
  ]),
  clinicPhone: z.string().regex(/^\d{10}$/).optional().or(z.literal('')),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  tosAccepted: z.boolean(),
  privacyAccepted: z.boolean(),
  dpaAccepted: z.boolean(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const clinic = await db.clinic.findUnique({
    where: { id: session.user.clinicId },
    select: {
      id: true,
      name: true,
      slug: true,
      address: true,
      city: true,
      speciality: true,
      clinicPhone: true,
      onboardingStep: true,
      onboardingComplete: true,
      tosAcceptedAt: true,
      privacyAcceptedAt: true,
      dpaAcceptedAt: true,
      whatsappConnected: true,
    },
  })

  if (!clinic) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(clinic)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: unknown = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const parsed = clinicUpsertSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 })
  }

  const { name, address, city, speciality, clinicPhone, slug, tosAccepted, privacyAccepted, dpaAccepted } = parsed.data

  if (!tosAccepted || !privacyAccepted || !dpaAccepted) {
    return NextResponse.json({ error: 'All legal agreements must be accepted' }, { status: 400 })
  }

  // Check slug availability (exclude current clinic if updating)
  const existingClinic = session.user.clinicId
    ? await db.clinic.findUnique({ where: { id: session.user.clinicId }, select: { slug: true } })
    : null

  const isSlugLocked = existingClinic?.slug != null && existingClinic.slug !== ''
  const slugToUse = isSlugLocked ? existingClinic!.slug : slug

  if (!isSlugLocked) {
    // Check slug uniqueness
    const slugTaken = await db.clinic.findUnique({ where: { slug: slugToUse } })
    if (slugTaken && slugTaken.id !== session.user.clinicId) {
      // Find a suggestion
      let suffix = 2
      let suggestion = `${slugToUse}-${suffix}`
      while (await db.clinic.findUnique({ where: { slug: suggestion } })) {
        suffix++
        suggestion = `${slugToUse}-${suffix}`
      }
      return NextResponse.json(
        { error: `This URL is taken. Try: ${suggestion}`, suggestion },
        { status: 409 }
      )
    }
  }

  const now = new Date()

  if (session.user.clinicId) {
    // Update existing clinic
    const updated = await db.clinic.update({
      where: { id: session.user.clinicId },
      data: {
        name,
        address,
        city,
        speciality,
        clinicPhone: clinicPhone || null,
        onboardingStep: 2,
        tosAcceptedAt: now,
        privacyAcceptedAt: now,
        dpaAcceptedAt: now,
      },
    })
    return NextResponse.json(updated)
  } else {
    // Create new clinic
    const generatedSlug = slugToUse || generateSlug(name)
    const clinic = await db.clinic.create({
      data: {
        name,
        slug: generatedSlug,
        address,
        city,
        speciality,
        clinicPhone: clinicPhone || null,
        onboardingStep: 2,
        tosAcceptedAt: now,
        privacyAcceptedAt: now,
        dpaAcceptedAt: now,
        users: {
          connect: { id: session.user.id },
        },
      },
    })

    // Update the user's clinicId
    await db.user.update({
      where: { id: session.user.id },
      data: { clinicId: clinic.id },
    })

    return NextResponse.json(clinic, { status: 201 })
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Settings page update — slug is read-only after first save
  const body: unknown = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const settingsSchema = z.object({
    name: z.string().min(1).max(100),
    address: z.string().min(1).max(200),
    city: z.string().min(1).max(50),
    speciality: z.string().min(1),
    clinicPhone: z.string().regex(/^\d{10}$/).optional().or(z.literal('')),
  })

  const parsed = settingsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 })
  }

  const updated = await db.clinic.update({
    where: { id: session.user.clinicId },
    data: {
      name: parsed.data.name,
      address: parsed.data.address,
      city: parsed.data.city,
      speciality: parsed.data.speciality,
      clinicPhone: parsed.data.clinicPhone || null,
    },
  })

  return NextResponse.json(updated)
}
