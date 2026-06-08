import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const slug = req.nextUrl.searchParams.get('slug')
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: 'Invalid slug format' }, { status: 400 })
  }

  const existing = await db.clinic.findUnique({
    where: { slug },
    select: { id: true },
  })

  // Available if not taken, or taken by own clinic
  const available = !existing || existing.id === session.user.clinicId

  if (!available) {
    // Find a suggestion
    let suffix = 2
    let suggestion = `${slug}-${suffix}`
    while (await db.clinic.findUnique({ where: { slug: suggestion }, select: { id: true } })) {
      suffix++
      suggestion = `${slug}-${suffix}`
    }
    return NextResponse.json({ available: false, suggestion })
  }

  return NextResponse.json({ available: true })
}
