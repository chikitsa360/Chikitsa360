import { notFound } from 'next/navigation'
import { RegistrationForm } from '@/components/event-registration/RegistrationForm'

interface EventData {
  id: string
  title: string
  description: string | null
  start_time: string
  end_time: string
  venue: string | null
  meeting_link: string | null
  max_seats: number
  seats_registered: number
  registration_deadline: string | null
  fee_paise: number | null
  status: string
  slug: string
  series_id: string | null
  waiting_count: number
  series_label: string | null
}

interface ClinicData {
  id: string
  name: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateFull(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatTimeRange(start: string, end: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }
  const s = new Date(start).toLocaleTimeString('en-IN', opts)
  const e = new Date(end).toLocaleTimeString('en-IN', opts)
  return `${s} – ${e}`
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function EventRegistrationPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/v1/events/by-slug/${slug}`, {
    cache: 'no-store',
  })

  if (!res.ok) {
    notFound()
  }

  const json = await res.json() as { data: { event: EventData; clinic: ClinicData } }
  const { event, clinic } = json.data

  const feeText = event.fee_paise
    ? `₹${Math.round(event.fee_paise / 100).toLocaleString('en-IN')}`
    : 'Free Event'

  const isDeadlinePassed = event.registration_deadline
    ? new Date(event.registration_deadline) < new Date()
    : false

  let closedMessage: string | null = null
  if (event.status === 'draft') {
    closedMessage = 'This event is not open for registration yet.'
  } else if (event.status === 'cancelled') {
    closedMessage = 'This event has been cancelled.'
  } else if (event.status === 'completed') {
    closedMessage = 'This event has ended.'
  } else if (isDeadlinePassed) {
    closedMessage = 'Registration is closed.'
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b border-[#E2E8F0] bg-white px-6 h-14 flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-[30px] w-[30px] items-center justify-center rounded bg-[#0A6EFF] text-[11px] font-bold text-white tracking-tight">
            {clinic.name.substring(0, 2).toUpperCase()}
          </div>
          <span className="text-[14px] font-bold text-[#0F172A]">{clinic.name}</span>
        </div>
        <span className="ml-auto text-[11px] text-[#94A3B8]">Powered by Chikitsa360</span>
      </header>

      {/* Main content */}
      <div className="flex-1">
        <div className="mx-auto max-w-[640px] px-4 py-8 pb-12">

          {/* Event details card */}
          <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white mb-5">
            {/* Banner */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#0A6EFF] to-[#0048CC] px-6 py-6">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/[0.06]" />
              <div className="absolute bottom-[-60px] right-5 h-30 w-30 rounded-full bg-white/[0.04]" />
              {event.series_label && (
                <p className="relative mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/70">
                  {event.series_label}
                </p>
              )}
              <h1 className="relative text-[22px] font-bold leading-snug tracking-tight text-white mb-3">
                {event.title}
              </h1>
              <div className="relative flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-[12px] font-medium text-white">
                  <svg className="h-2.5 w-2.5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                  {formatDateFull(event.start_time)}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-[12px] font-medium text-white">
                  <svg className="h-2.5 w-2.5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {formatTimeRange(event.start_time, event.end_time)}
                </span>
                {(event.venue ?? event.meeting_link) && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-[12px] font-medium text-white">
                    <svg className="h-2.5 w-2.5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    {event.venue ?? 'Online'}
                  </span>
                )}
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium text-white ${event.fee_paise ? 'border-white/20 bg-white/15' : 'border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.2)]'}`}>
                  {feeText}
                </span>
              </div>
            </div>

            {event.description && (
              <div className="px-6 py-5">
                <p className="text-[14px] text-[#64748B] leading-relaxed">{event.description}</p>
              </div>
            )}
          </div>

          {/* Closed state or registration form */}
          {closedMessage ? (
            <div className="rounded-2xl border border-[#E2E8F0] bg-white px-6 py-10 text-center">
              <p className="text-[16px] font-semibold text-[#64748B]">{closedMessage}</p>
            </div>
          ) : (
            <RegistrationForm event={event} slug={slug} />
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#E2E8F0] bg-white py-5 text-center text-[12px] text-[#94A3B8]">
        {clinic.name} · Powered by <strong>Chikitsa360</strong>
      </footer>
    </div>
  )
}
