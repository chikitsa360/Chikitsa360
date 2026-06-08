import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { ClinicProfileForm } from '@/components/onboarding/ClinicProfileForm'

export default async function Step1Page() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  // Prefill existing clinic data if any
  let prefill: {
    name?: string
    address?: string
    city?: string
    speciality?: string
    clinicPhone?: string
    slug?: string
    slugLocked?: boolean
  } = {}

  if (session.user.clinicId) {
    const clinic = await db.clinic.findUnique({
      where: { id: session.user.clinicId },
      select: {
        name: true,
        address: true,
        city: true,
        speciality: true,
        clinicPhone: true,
        slug: true,
        tosAcceptedAt: true,
      },
    })
    if (clinic) {
      prefill = {
        name: clinic.name ?? undefined,
        address: clinic.address ?? undefined,
        city: clinic.city ?? undefined,
        speciality: clinic.speciality ?? undefined,
        clinicPhone: clinic.clinicPhone ?? undefined,
        slug: clinic.slug ?? undefined,
        slugLocked: !!clinic.tosAcceptedAt, // locked once legal accepted
      }
    }
  }

  return <ClinicProfileForm prefill={prefill} />
}
