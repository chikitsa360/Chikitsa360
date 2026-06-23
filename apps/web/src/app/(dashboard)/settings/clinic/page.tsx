import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { ClinicSettingsForm } from '@/components/settings/ClinicSettingsForm'
import { BookingLinkCard } from '@/components/settings/BookingLinkCard'

export default async function ClinicSettingsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!session.user.clinicId) redirect('/onboarding')

  const clinic = await db.clinic.findUnique({
    where: { id: session.user.clinicId },
    select: {
      name: true,
      slug: true,
      address: true,
      city: true,
      speciality: true,
      clinicPhone: true,
      logoUrl: true,
    },
  })

  if (!clinic) redirect('/onboarding')

  return (
    <div className="mx-auto max-w-[640px] space-y-5">
      <BookingLinkCard slug={clinic.slug} />
      <ClinicSettingsForm
        clinicName={clinic.name}
        slug={clinic.slug}
        address={clinic.address ?? ''}
        city={clinic.city ?? ''}
        speciality={clinic.speciality ?? ''}
        clinicPhone={clinic.clinicPhone ?? ''}
        logoUrl={clinic.logoUrl}
      />
    </div>
  )
}
