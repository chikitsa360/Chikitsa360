'use client'

import * as React from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EventInfo {
  id: string
  title: string
  start_time: string
  end_time: string
  venue: string | null
  meeting_link: string | null
  fee_paise: number | null
  max_seats: number
  seats_registered: number
  waiting_count: number
}

interface Props {
  event: EventInfo
  slug: string
}

type RegistrationState =
  | { step: 'form' }
  | { step: 'seats_full' }
  | { step: 'confirmed'; referenceNumber: string; name: string; phone: string }
  | { step: 'waitlisted'; position: number }

// ─── Helpers ─────────────────────────────────────────────────────────────────

const isValidIndianPhone = (phone: string) => /^[6-9]\d{9}$/.test(phone)

function formatDateTime(start: string, end: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }
  const timeOpts: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }
  const dateStr = new Date(start).toLocaleDateString('en-IN', opts)
  const startTime = new Date(start).toLocaleTimeString('en-IN', timeOpts)
  const endTime = new Date(end).toLocaleTimeString('en-IN', timeOpts)
  return `${dateStr} · ${startTime} – ${endTime}`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SeatAvailability({ event, full }: { event: EventInfo; full?: boolean }) {
  const available = Math.max(0, event.max_seats - event.seats_registered)
  const pct = Math.min(100, Math.round((event.seats_registered / event.max_seats) * 100))

  return (
    <div className="rounded-xl bg-[#F1F5F9] p-4 mb-5">
      <div className="flex items-center gap-4 mb-2">
        <div className="flex flex-col items-center flex-1">
          <span className="text-[22px] font-bold text-[#0A6EFF] font-sans">{event.max_seats}</span>
          <span className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide">Total Seats</span>
        </div>
        <div className="w-px h-10 bg-[#E2E8F0]" />
        <div className="flex flex-col items-center flex-1">
          <span className={`text-[22px] font-bold font-sans ${full ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>{available}</span>
          <span className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide">Available</span>
        </div>
        <div className="w-px h-10 bg-[#E2E8F0]" />
        <div className="flex flex-col items-center flex-1">
          <span className="text-[22px] font-bold text-[#94A3B8] font-sans">{event.seats_registered}</span>
          <span className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide">Registered</span>
        </div>
      </div>
      <div className="h-1.5 w-full rounded-full bg-[#E2E8F0] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${full ? 'bg-[#F59E0B]' : 'bg-[#0A6EFF]'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={`text-center text-[12px] mt-1 ${full ? 'font-semibold text-[#F59E0B]' : 'text-[#64748B]'}`}>
        {full ? 'All seats are filled' : `${available} seat${available !== 1 ? 's' : ''} remaining — register now to secure your spot`}
      </p>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function RegistrationForm({ event, slug }: Props) {
  const [state, setState] = React.useState<RegistrationState>({ step: 'form' })
  const [name, setName] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [phoneError, setPhoneError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [apiError, setApiError] = React.useState<string | null>(null)
  const [alreadyRegisteredRef, setAlreadyRegisteredRef] = React.useState<string | null>(null)

  const isFull = event.seats_registered >= event.max_seats

  const handleRegister = async (joinWaitlist = false) => {
    setPhoneError(null)
    setApiError(null)
    setAlreadyRegisteredRef(null)

    if (!isValidIndianPhone(phone)) {
      setPhoneError('Enter a valid 10-digit Indian mobile number')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/v1/events/${slug}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone, joinWaitlist }),
      })
      const json = await res.json() as {
        data?: { status: string; referenceNumber?: string; position?: number }
        error?: { code?: string; message?: string; referenceNumber?: string }
      }

      if (!res.ok) {
        if (json.error?.code === 'ALREADY_REGISTERED') {
          setAlreadyRegisteredRef(json.error.referenceNumber ?? null)
          return
        }
        setApiError(json.error?.message ?? 'Registration failed. Please try again.')
        return
      }

      const data = json.data!
      if (data.status === 'registered' && data.referenceNumber) {
        setState({ step: 'confirmed', referenceNumber: data.referenceNumber, name: name.trim(), phone })
      } else if (data.status === 'seats_full') {
        setState({ step: 'seats_full' })
      } else if (data.status === 'waitlisted' && data.position !== undefined) {
        setState({ step: 'waitlisted', position: data.position })
      }
    } catch {
      setApiError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const feeText = event.fee_paise
    ? `₹${Math.round(event.fee_paise / 100).toLocaleString('en-IN')}`
    : 'Free'

  // ── State C: Confirmation ───────────────────────────────────────────────────
  if (state.step === 'confirmed') {
    return (
      <div className="rounded-2xl border-[1.5px] border-[rgba(16,185,129,0.25)] bg-white p-8 text-center mt-2">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(16,185,129,0.1)]">
          <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#10B981" strokeWidth={2.5}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="text-[22px] font-bold text-[#10B981] font-sans mb-1">You&apos;re Registered!</h2>
        <p className="text-[14px] text-[#64748B] mb-5">Your seat is confirmed. Save your reference number.</p>

        <div className="rounded-xl bg-[#F1F5F9] px-4 py-4 mb-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] mb-1.5">Your Reference Number</p>
          <p className="font-mono text-[22px] font-bold text-[#0F172A] tracking-wider">{state.referenceNumber}</p>
        </div>

        <div className="text-left rounded-xl bg-[#F0F4FF] px-4 py-3 mb-5 space-y-2.5">
          <div className="flex items-center gap-2.5 text-[13px]">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[rgba(10,110,255,0.08)]">
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#0A6EFF" strokeWidth={2}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">Name</p>
              <p className="font-semibold text-[#0F172A]">{state.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-[13px]">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[rgba(10,110,255,0.08)]">
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#0A6EFF" strokeWidth={2}>
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">Date &amp; Time</p>
              <p className="font-semibold text-[#0F172A]">{formatDateTime(event.start_time, event.end_time)}</p>
            </div>
          </div>
          {(event.venue ?? event.meeting_link) && (
            <div className="flex items-center gap-2.5 text-[13px]">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[rgba(10,110,255,0.08)]">
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#0A6EFF" strokeWidth={2}>
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">Venue</p>
                <p className="font-semibold text-[#0F172A]">{event.venue ?? event.meeting_link}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-[rgba(37,211,102,0.2)] bg-[rgba(37,211,102,0.06)] px-3 py-2.5 text-[13px] text-[#065F46] mb-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
          </svg>
          Confirmation and a 24h reminder will be sent to +91 {state.phone} on WhatsApp.
        </div>

        <button className="w-full h-10 rounded-lg border border-[#E2E8F0] bg-transparent text-[13px] font-medium text-[#64748B]">
          Cancel my registration
        </button>
      </div>
    )
  }

  // ── State: Waitlisted ───────────────────────────────────────────────────────
  if (state.step === 'waitlisted') {
    return (
      <div className="rounded-2xl border border-[rgba(139,92,246,0.3)] bg-[rgba(139,92,246,0.04)] p-8 text-center mt-2">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(139,92,246,0.1)]">
          <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#8B5CF6" strokeWidth={2}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <h2 className="text-[20px] font-bold text-[#8B5CF6] font-sans mb-2">You&apos;re on the Waiting List!</h2>
        <p className="text-[14px] text-[#64748B]">
          You&apos;re <span className="font-bold text-[#8B5CF6]">#{state.position}</span> on the waiting list.
          We&apos;ll notify you on WhatsApp if a seat opens up.
        </p>
      </div>
    )
  }

  // ── State B: Seats full ─────────────────────────────────────────────────────
  if (state.step === 'seats_full' || (isFull && state.step === 'form')) {
    return (
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
        <SeatAvailability event={event} full />

        <div className="flex gap-3 rounded-xl bg-[rgba(139,92,246,0.06)] border-[1.5px] border-[rgba(139,92,246,0.2)] px-4 py-3 mb-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[rgba(139,92,246,0.12)]">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#8B5CF6" strokeWidth={2}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <p className="text-[14px] font-bold text-[#8B5CF6] mb-0.5">Join the Waiting List</p>
            <p className="text-[13px] text-[#64748B] leading-relaxed">
              This event is fully booked. Join the waiting list — you&apos;ll be automatically registered and notified if a seat opens up.
            </p>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-[13px] font-semibold text-[#0F172A] mb-1.5">Full Name</label>
          <input
            type="text"
            placeholder="Enter your full name"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full h-[42px] rounded-lg border-[1.5px] border-[#E2E8F0] px-3.5 text-[14px] text-[#0F172A] bg-white focus:outline-none focus:border-[#0A6EFF] focus:ring-2 focus:ring-[rgba(10,110,255,0.1)]"
          />
        </div>

        <div className="mb-4">
          <label className="block text-[13px] font-semibold text-[#0F172A] mb-1.5">Mobile Number</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-[#64748B] font-medium">+91</span>
            <input
              type="tel"
              placeholder="10-digit mobile number"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full h-[42px] rounded-lg border-[1.5px] border-[#E2E8F0] pl-10 pr-3.5 text-[14px] text-[#0F172A] bg-white focus:outline-none focus:border-[#0A6EFF] focus:ring-2 focus:ring-[rgba(10,110,255,0.1)]"
            />
          </div>
          {phoneError && <p className="mt-1 text-[12px] text-[#EF4444]">{phoneError}</p>}
        </div>

        {apiError && (
          <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-[13px] text-red-700">
            {apiError}
          </div>
        )}

        <button
          onClick={() => void handleRegister(true)}
          disabled={loading || !name.trim()}
          className="w-full h-[46px] rounded-lg bg-[#8B5CF6] text-white text-[15px] font-bold flex items-center justify-center gap-2 hover:bg-[#7C3AED] disabled:opacity-50"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          {loading ? 'Joining…' : `Join Waiting List — Position #${event.waiting_count + 1}`}
        </button>
        <p className="text-center text-[12px] text-[#94A3B8] mt-3">
          We&apos;ll notify you via WhatsApp if a seat becomes available.
        </p>

        <div className="mt-4 text-center">
          <button
            onClick={() => setState({ step: 'form' })}
            className="text-[13px] text-[#64748B] underline"
          >
            No thanks
          </button>
        </div>
      </div>
    )
  }

  // ── State A: Registration form ──────────────────────────────────────────────
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
      <SeatAvailability event={event} />

      <h3 className="text-[16px] font-bold text-[#0F172A] font-sans mb-1">Register for this Event</h3>
      <p className="text-[13px] text-[#64748B] mb-5">Enter your details to secure your seat. Your confirmation will be sent via WhatsApp.</p>

      <div className="mb-4">
        <label className="block text-[13px] font-semibold text-[#0F172A] mb-1.5">Full Name</label>
        <input
          type="text"
          placeholder="Enter your full name"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full h-[42px] rounded-lg border-[1.5px] border-[#E2E8F0] px-3.5 text-[14px] text-[#0F172A] bg-white focus:outline-none focus:border-[#0A6EFF] focus:ring-2 focus:ring-[rgba(10,110,255,0.1)]"
        />
      </div>

      <div className="mb-5">
        <label className="block text-[13px] font-semibold text-[#0F172A] mb-1.5">Mobile Number</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-[#64748B] font-medium">+91</span>
          <input
            type="tel"
            placeholder="10-digit mobile number"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className="w-full h-[42px] rounded-lg border-[1.5px] border-[#E2E8F0] pl-10 pr-3.5 text-[14px] text-[#0F172A] bg-white focus:outline-none focus:border-[#0A6EFF] focus:ring-2 focus:ring-[rgba(10,110,255,0.1)]"
          />
        </div>
        {phoneError && <p className="mt-1 text-[12px] text-[#EF4444]">{phoneError}</p>}
        <p className="mt-1 text-[12px] text-[#94A3B8]">Your confirmation and event reminders will be sent to this number on WhatsApp</p>
      </div>

      {alreadyRegisteredRef && (
        <div className="mb-4 rounded-xl bg-[rgba(10,110,255,0.05)] border-[1.5px] border-[rgba(10,110,255,0.2)] px-4 py-3">
          <p className="text-[14px] font-bold text-[#0A6EFF] mb-1 flex items-center gap-1.5">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Already Registered
          </p>
          <p className="text-[13px] text-[#64748B]">
            You&apos;re already registered for this event.{' '}
            Reference: <span className="font-mono font-bold text-[#0A6EFF] bg-[rgba(10,110,255,0.08)] px-1.5 py-0.5 rounded text-[13px]">{alreadyRegisteredRef}</span>
          </p>
        </div>
      )}

      {apiError && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-[13px] text-red-700">
          {apiError}
        </div>
      )}

      <button
        onClick={() => void handleRegister(false)}
        disabled={loading || !name.trim()}
        className="w-full h-[46px] rounded-lg bg-[#0A6EFF] text-white text-[15px] font-bold flex items-center justify-center gap-2 hover:bg-[#0058CC] disabled:opacity-50 transition-colors"
      >
        {loading ? (
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
        {loading ? 'Registering…' : `Confirm Registration — ${feeText}`}
      </button>

      <p className="text-center text-[12px] text-[#94A3B8] mt-3 leading-relaxed">
        By registering, you agree to receive event updates on WhatsApp. You can opt out at any time.
      </p>
    </div>
  )
}
