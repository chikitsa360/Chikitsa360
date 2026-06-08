import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const clinic = await db.clinic.findUnique({
    where: { id: session.user.clinicId },
    select: {
      whatsappConnected: true,
      whatsappWabaId: true,
      whatsappPhoneNumberId: true,
    },
  })

  if (!clinic) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({
    connected: clinic.whatsappConnected,
    wabaId: clinic.whatsappWabaId,
    phoneNumberId: clinic.whatsappPhoneNumberId,
  })
}
