import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { generateQrCodePng } from '@/lib/qr-code'

/**
 * GET /api/v1/clinics/qr-code
 * Authenticated — generates a QR code PNG for the clinic's booking URL.
 * Returns a PNG image download.
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const clinic = await db.clinic.findUnique({
    where: { id: session.user.clinicId },
    select: { slug: true, name: true },
  })

  if (!clinic) {
    return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })
  }

  const bookingUrl = `https://cliniqly.com/book/${clinic.slug}`
  const pngBuffer = await generateQrCodePng(bookingUrl)

  return new NextResponse(new Uint8Array(pngBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="${clinic.slug}-booking-qr.png"`,
      'Cache-Control': 'no-store',
    },
  })
}
