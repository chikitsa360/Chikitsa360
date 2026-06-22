import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'edge'

/**
 * GET /api/og/book/[slug]
 * Generates a dynamic OG image for the clinic's booking page.
 * Used in <meta property="og:image"> on the public booking page.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const clinic = await db.clinic.findUnique({
    where: { slug },
    select: { name: true, city: true, speciality: true },
  })

  const clinicName = clinic?.name ?? 'Book an Appointment'
  const city = clinic?.city ?? ''
  const speciality = clinic?.speciality
    ? clinic.speciality.split(',').map((s) => s.trim()).filter(Boolean).join(' · ')
    : 'Healthcare'

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0A6EFF 0%, #0052CC 100%)',
          fontFamily: 'system-ui, sans-serif',
          padding: '60px',
        }}
      >
        <div
          style={{
            background: 'white',
            borderRadius: '24px',
            padding: '48px 56px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          }}
        >
          <div
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#0A6EFF',
              marginBottom: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            {speciality}
          </div>
          <div
            style={{
              fontSize: '52px',
              fontWeight: 800,
              color: '#0F172A',
              lineHeight: 1.1,
              marginBottom: '16px',
            }}
          >
            {clinicName}
          </div>
          {city && (
            <div
              style={{
                fontSize: '24px',
                color: '#475569',
                marginBottom: '28px',
              }}
            >
              {city}
            </div>
          )}
          <div
            style={{
              background: '#0A6EFF',
              color: 'white',
              borderRadius: '12px',
              padding: '16px 40px',
              fontSize: '22px',
              fontWeight: 700,
            }}
          >
            Book an Appointment
          </div>
          <div
            style={{
              fontSize: '16px',
              color: '#94A3B8',
              marginTop: '20px',
            }}
          >
            No app needed · Available slots shown instantly
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
