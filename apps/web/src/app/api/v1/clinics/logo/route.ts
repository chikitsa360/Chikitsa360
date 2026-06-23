import { NextRequest, NextResponse } from 'next/server'
import { put, del } from '@vercel/blob'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']

/**
 * POST /api/v1/clinics/logo
 * Uploads a clinic logo to Vercel Blob and saves the URL. OWNER only.
 * Body: multipart/form-data with field "logo" (File).
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const clinicId = session.user.clinicId

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('logo')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing logo file' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Invalid file type. Allowed: JPG, PNG, WebP, GIF, SVG' },
      { status: 422 }
    )
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'File too large. Maximum size is 2 MB' }, { status: 422 })
  }

  // Delete previous logo if one exists
  const existing = await db.clinic.findUnique({
    where: { id: clinicId },
    select: { logoUrl: true },
  })
  if (existing?.logoUrl) {
    try {
      await del(existing.logoUrl)
    } catch {
      // Non-fatal — old blob may already be deleted
    }
  }

  const ext = file.name.split('.').pop() ?? 'png'
  const blob = await put(`clinic-logos/${clinicId}.${ext}`, file, {
    access: 'public',
    allowOverwrite: true,
  })

  await db.clinic.update({
    where: { id: clinicId },
    data: { logoUrl: blob.url },
  })

  return NextResponse.json({ url: blob.url })
}

/**
 * DELETE /api/v1/clinics/logo
 * Removes the clinic logo from Blob storage and clears the URL. OWNER only.
 */
export async function DELETE(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const clinicId = session.user.clinicId

  const clinic = await db.clinic.findUnique({
    where: { id: clinicId },
    select: { logoUrl: true },
  })

  if (clinic?.logoUrl) {
    try {
      await del(clinic.logoUrl)
    } catch {
      // Non-fatal
    }
  }

  await db.clinic.update({
    where: { id: clinicId },
    data: { logoUrl: null },
  })

  return NextResponse.json({ ok: true })
}
