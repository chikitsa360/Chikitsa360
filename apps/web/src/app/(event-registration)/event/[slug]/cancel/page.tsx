'use client'

import * as React from 'react'
import { useSearchParams } from 'next/navigation'

interface EventInfo {
  title: string
  start_time: string
  venue: string | null
  meeting_link: string | null
}

type PageState =
  | { step: 'loading' }
  | { step: 'invalid'; message: string }
  | { step: 'confirm'; event: EventInfo; slug: string; token: string }
  | { step: 'cancelling'; event: EventInfo; slug: string; token: string }
  | { step: 'done' }

function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export default function CancelRegistrationPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const resolvedParams = React.use(params)
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [state, setState] = React.useState<PageState>({ step: 'loading' })

  React.useEffect(() => {
    if (!token) {
      setState({ step: 'invalid', message: 'Invalid cancellation link.' })
      return
    }

    // Load event via public by-slug API to show event details
    fetch(`/api/v1/events/by-slug/${resolvedParams.slug}`)
      .then(async res => {
        if (!res.ok) {
          setState({ step: 'invalid', message: 'Invalid cancellation link.' })
          return
        }
        const json = await res.json() as { data: { event: EventInfo } }
        const ev = json.data.event

        // Check if event has started
        if (new Date(ev.start_time) <= new Date()) {
          setState({ step: 'invalid', message: 'This cancellation link has expired. The event has already started or ended.' })
          return
        }

        setState({ step: 'confirm', event: ev, slug: resolvedParams.slug, token })
      })
      .catch(() => setState({ step: 'invalid', message: 'Unable to load event details. Please try again.' }))
  }, [resolvedParams.slug, token])

  async function handleCancel() {
    if (state.step !== 'confirm') return
    const { event, slug: eventSlug, token: cancelToken } = state
    setState({ step: 'cancelling', event, slug: eventSlug, token: cancelToken })

    try {
      const res = await fetch(`/api/v1/events/${eventSlug}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: cancelToken }),
      })
      const json = await res.json() as { data?: { status: string }; error?: { code: string; message: string } }

      if (!res.ok) {
        setState({ step: 'invalid', message: json.error?.message ?? 'Cancellation failed. Please try again.' })
        return
      }

      setState({ step: 'done' })
    } catch {
      setState({ step: 'invalid', message: 'Something went wrong. Please try again.' })
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F0F4FF]">
      <div className="mx-auto w-full max-w-[480px] px-4 py-12">
        {state.step === 'loading' && (
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-10 text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-[#0A6EFF] border-t-transparent" />
            <p className="text-[14px] text-[#64748B]">Loading…</p>
          </div>
        )}

        {state.step === 'invalid' && (
          <div className="rounded-2xl border border-[#FECACA] bg-white p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(239,68,68,0.1)]">
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#EF4444" strokeWidth={2.5}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 className="mb-2 text-[18px] font-bold text-[#0F172A]">Link Unavailable</h2>
            <p className="text-[14px] text-[#64748B] leading-relaxed">{state.message}</p>
          </div>
        )}

        {(state.step === 'confirm' || state.step === 'cancelling') && (
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(239,68,68,0.08)]">
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#EF4444" strokeWidth={2}>
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </div>
            <h2 className="mb-1 text-center text-[20px] font-bold text-[#0F172A]">Cancel Registration</h2>
            <p className="mb-6 text-center text-[13px] text-[#64748B]">Are you sure you want to cancel your spot?</p>

            <div className="mb-6 rounded-xl bg-[#F1F5F9] px-4 py-4 space-y-2">
              <p className="text-[13px] font-bold text-[#0F172A]">{state.event.title}</p>
              <p className="text-[12px] text-[#64748B]">{formatDateTime(state.event.start_time)}</p>
              {(state.event.venue ?? state.event.meeting_link) && (
                <p className="text-[12px] text-[#64748B]">{state.event.venue ?? state.event.meeting_link}</p>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => void handleCancel()}
                disabled={state.step === 'cancelling'}
                className="w-full h-[46px] rounded-lg bg-[#EF4444] text-white text-[15px] font-bold flex items-center justify-center gap-2 hover:bg-[#DC2626] disabled:opacity-60"
              >
                {state.step === 'cancelling' ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  'Yes, Cancel My Registration'
                )}
              </button>
              <a
                href={`/event/${state.slug}`}
                className="block w-full h-[42px] rounded-lg border border-[#E2E8F0] text-[14px] font-medium text-[#64748B] flex items-center justify-center hover:bg-[#F8FAFC]"
              >
                Keep My Spot
              </a>
            </div>
          </div>
        )}

        {state.step === 'done' && (
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(16,185,129,0.1)]">
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#10B981" strokeWidth={2.5}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="mb-2 text-[20px] font-bold text-[#0F172A]">Registration Cancelled</h2>
            <p className="text-[14px] text-[#64748B] leading-relaxed">
              Your registration has been cancelled successfully. Your seat has been freed up.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
