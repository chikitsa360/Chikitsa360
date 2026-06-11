import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { BookingClient } from './BookingClient'
import { isPlanExpired } from '@/lib/plan/check-plan'

interface PageProps {
  params: Promise<{ slug: string }>
}

// Fetch public clinic info server-side for fast LCP
async function getClinicData(slug: string) {
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
      planExpiresAt: true,
      whatsappConnected: true,
    },
  })
  return clinic
}

async function getDoctors(clinicId: string) {
  const schemaName = `clinic_${clinicId}`
  const doctors = await db.$queryRawUnsafe<{ id: string; name: string }[]>(
    `SELECT id, name FROM "${schemaName}".doctors ORDER BY name ASC`
  )
  return doctors
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const clinic = await getClinicData(slug)
  if (!clinic) return { title: 'Book an Appointment' }

  const title = `${clinic.name} — Book an Appointment`
  const description = `Book your appointment at ${clinic.name}${clinic.city ? ` in ${clinic.city}` : ''}. Choose from available slots. No app needed.`

  return {
    title,
    description,
    openGraph: {
      title: `${clinic.name} — Book an Appointment`,
      description: `Book your appointment easily at ${clinic.name}. No app download needed.`,
      url: `https://cliniqly.com/book/${slug}`,
      images: [{ url: `/api/og/book/${slug}`, width: 1200, height: 630 }],
    },
  }
}

export default async function BookingPage({ params }: PageProps) {
  const { slug } = await params
  const clinic = await getClinicData(slug)
  if (!clinic) notFound()

  const doctors = await getDoctors(clinic.id)

  const planExpired = isPlanExpired(clinic.planExpiresAt)

  const clinicInfo = {
    id: clinic.id,
    name: clinic.name,
    slug: clinic.slug,
    speciality: clinic.speciality,
    address: clinic.address,
    city: clinic.city,
    clinicPhone: clinic.clinicPhone,
    isPlanExpired: planExpired,
    whatsappConnected: clinic.whatsappConnected,
  }

  return (
    <div className="min-h-screen bg-muted/30" style={{ minWidth: '360px' }}>
      {/* Clinic header card */}
      <div className="bg-card shadow-sm">
        <div className="mx-auto max-w-[640px] px-4 py-5">
          <h1 className="text-[20px] font-semibold text-primary" style={{ fontFamily: 'var(--font-plus-jakarta-sans, system-ui)' }}>
            {clinic.name}
          </h1>
          {clinic.speciality && (
            <p className="mt-0.5 text-[13px] text-muted-foreground">{clinic.speciality}</p>
          )}
          {(clinic.address || clinic.city) && (
            <p className="mt-1 text-[12px] text-muted-foreground">
              {[clinic.address, clinic.city].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
      </div>

      {/* Main content */}
      <main className="mx-auto max-w-[640px] px-4 py-5">
        {planExpired ? (
          <div className="rounded-xl border border-border bg-card px-5 py-8 text-center shadow-sm">
            <p className="text-[14px] text-foreground">
              Online booking is temporarily unavailable. Please contact the clinic directly
              {clinic.clinicPhone ? ` at ${clinic.clinicPhone}` : ''}.
            </p>
          </div>
        ) : (
          <BookingClient clinic={clinicInfo} doctors={doctors} />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-8 pb-8 text-center">
        <p className="text-[12px] text-muted-foreground">Powered by Cliniqly</p>
      </footer>
    </div>
  )
}
