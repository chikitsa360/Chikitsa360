import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// 512 KB — enough for any logo at display sizes (28–48 px)
const MAX_SIZE_BYTES = 512 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']

/**
 * POST /api/v1/clinics/logo
 * Converts uploaded image to a base64 data URL and saves it in the DB.
 * No external storage required. OWNER only.
 * Body: multipart/form-data with field "logo" (File, max 512 KB).
 */
export async function POST(req: NextRequest) {
  try {
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
      return NextResponse.json(
        { error: 'File too large. Maximum size is 512 KB. Tip: compress your logo before uploading.' },
        { status: 422 }
      )
    }

    // Convert to base64 data URL — no external storage needed
    const buffer = await file.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const dataUrl = `data:${file.type};base64,${base64}`

    await db.clinic.update({
      where: { id: clinicId },
      data: { logoUrl: dataUrl },
    })

    return NextResponse.json({ url: dataUrl })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[logo] POST failed:', message)
    return NextResponse.json({ error: 'Upload failed', detail: message }, { status: 500 })
  }
}

/**
 * DELETE /api/v1/clinics/logo
 * Clears the logo URL from the database. OWNER only.
 */
export async function DELETE(_req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.clinicId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (session.user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await db.clinic.update({
      where: { id: session.user.clinicId },
      data: { logoUrl: null },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[logo] DELETE failed:', message)
    return NextResponse.json({ error: 'Failed to remove logo', detail: message }, { status: 500 })
  }
}
