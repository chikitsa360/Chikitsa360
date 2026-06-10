'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@chikitsa360/core'
import { EditEventModal } from './EditEventModal'
import type { EventItem } from './EventsListClient'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EventDetail {
  id: string
  clinic_id: string
  series_id: string | null
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
  created_by: string
  created_at: string
  updated_at: string
  registered_count: number
  waiting_count: number
  invited_sent_count: number
  series_recurrence_type: string | null
  series_total_occurrences: number | null
}

type Tab = 'overview' | 'registrants' | 'waiting-list' | 'invitations'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isToday(isoString: string): boolean {
  const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  const eventDate = new Date(new Date(isoString).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  return eventDate.toDateString() === nowIST.toDateString()
}

function formatFullDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTimeRange(start: string, end: string): string {
  const opts: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }
  const s = new Date(start).toLocaleTimeString('en-IN', opts)
  const e = new Date(end).toLocaleTimeString('en-IN', opts)
  return `${s} – ${e} IST`
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    published: 'bg-green-50 text-green-700',
    draft: 'bg-muted text-muted-foreground',
    completed: 'bg-gray-100 text-gray-600',
    cancelled: 'bg-red-50 text-red-600',
  }
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold', cfg[status] ?? 'bg-muted text-muted-foreground')}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

// ─── Stat block ───────────────────────────────────────────────────────────────

function StatBlock({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-border bg-card px-6 py-4">
      <div className={cn('text-[26px] font-bold tabular-nums leading-none', color ?? 'text-foreground')}>{value}</div>
      <div className="mt-1 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  event: EventDetail
}

export function EventDetailClient({ event: initialEvent }: Props) {
  const [event, setEvent] = React.useState(initialEvent)
  const [activeTab, setActiveTab] = React.useState<Tab>('overview')
  const [showEditModal, setShowEditModal] = React.useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = React.useState(false)
  const [actionLoading, setActionLoading] = React.useState(false)
  const [actionError, setActionError] = React.useState<string | null>(null)

  const handlePublish = async () => {
    setActionLoading(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/v1/events/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish' }),
      })
      if (res.ok) {
        const json = await res.json() as { data: { event: EventDetail } }
        setEvent(json.data.event)
      } else {
        const json = await res.json() as { error?: { message?: string } }
        setActionError(json.error?.message ?? 'Failed to publish event')
      }
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancel = async () => {
    setActionLoading(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/v1/events/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      })
      if (res.ok) {
        const json = await res.json() as { data: { event: EventDetail } }
        setEvent(json.data.event)
        setShowCancelConfirm(false)
      } else {
        const json = await res.json() as { error?: { message?: string } }
        setActionError(json.error?.message ?? 'Failed to cancel event')
      }
    } finally {
      setActionLoading(false)
    }
  }

  const editEventItem: EventItem = {
    id: event.id,
    title: event.title,
    slug: event.slug,
    start_time: event.start_time,
    end_time: event.end_time,
    status: event.status,
    max_seats: event.max_seats,
    seats_registered: event.seats_registered,
    venue: event.venue,
    meeting_link: event.meeting_link,
    fee_paise: event.fee_paise,
    series_id: event.series_id,
    series_position: null,
    waiting_count: event.waiting_count,
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'registrants', label: 'Registrants' },
    { key: 'waiting-list', label: 'Waiting List' },
    { key: 'invitations', label: 'Invitations' },
  ]

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-1.5 text-[13px] text-muted-foreground">
        <Link href="/events" className="hover:text-foreground hover:underline">Events</Link>
        <span>›</span>
        <span className="text-foreground font-medium truncate max-w-[280px]">{event.title}</span>
      </div>

      {/* Page header */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-[22px] font-bold text-foreground tracking-tight truncate">{event.title}</h1>
          <StatusBadge status={event.status} />
          {isToday(event.start_time) && (
            <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">TODAY</span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {actionError && (
            <span className="text-[12px] text-red-600">{actionError}</span>
          )}
          {(event.status === 'draft' || event.status === 'published') && (
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-[13px] font-medium text-foreground hover:bg-muted"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit
            </button>
          )}
          {event.status === 'draft' && (
            <button
              onClick={() => void handlePublish()}
              disabled={actionLoading}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {actionLoading ? 'Publishing…' : 'Publish'}
            </button>
          )}
          {event.status === 'published' && (
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-[13px] font-semibold text-red-700 hover:bg-red-100"
            >
              Cancel Event
            </button>
          )}
        </div>
      </div>

      {/* Stat blocks */}
      <div className="mb-6 grid grid-cols-5 gap-3">
        <StatBlock label="Total Seats" value={event.max_seats} />
        <StatBlock label="Registered" value={event.registered_count} color="text-primary" />
        <StatBlock label="Remaining" value={Math.max(0, event.max_seats - event.registered_count)} color="text-green-600" />
        <StatBlock label="Waiting List" value={event.waiting_count} color="text-violet-600" />
        <StatBlock label="Invitations Sent" value={event.invited_sent_count} />
      </div>

      {/* Tabs */}
      <div className="mb-5 flex border-b border-border">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-4 pb-2.5 pt-2 text-[13px] font-medium transition-colors border-b-2 -mb-px',
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-3 gap-6">
          {/* Details card */}
          <div className="col-span-2 rounded-xl border border-border bg-card p-6 space-y-5">
            {/* Description */}
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Description</div>
              {event.description ? (
                <p className="text-[14px] text-foreground leading-relaxed">{event.description}</p>
              ) : (
                <p className="text-[13px] text-muted-foreground italic">No description</p>
              )}
            </div>

            <div className="h-px bg-border" />

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Date</div>
                <div className="text-[14px] font-medium text-foreground">{formatFullDate(event.start_time)}</div>
              </div>
              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Time</div>
                <div className="text-[14px] font-medium text-foreground">{formatTimeRange(event.start_time, event.end_time)}</div>
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Location & Fee */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Location</div>
                {event.venue ? (
                  <div className="text-[14px] font-medium text-foreground">{event.venue}</div>
                ) : event.meeting_link ? (
                  <a href={event.meeting_link} target="_blank" rel="noopener noreferrer" className="text-[14px] text-primary hover:underline break-all">
                    {event.meeting_link}
                  </a>
                ) : (
                  <div className="text-[14px] text-muted-foreground">—</div>
                )}
              </div>
              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Fee</div>
                <div className="text-[14px] font-medium text-foreground">
                  {event.fee_paise !== null ? `₹${(event.fee_paise / 100).toLocaleString('en-IN')}` : 'Free'}
                </div>
              </div>
            </div>

            {/* Registration deadline */}
            {event.registration_deadline && (
              <>
                <div className="h-px bg-border" />
                <div>
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Registration Deadline</div>
                  <div className="text-[14px] font-medium text-foreground">
                    {new Date(event.registration_deadline).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                </div>
              </>
            )}

            {/* Series info */}
            {event.series_id && event.series_recurrence_type && (
              <>
                <div className="h-px bg-border" />
                <div>
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Series</div>
                  <div className="text-[14px] font-medium text-foreground">
                    Part of {event.series_recurrence_type} series · {event.series_total_occurrences} events
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Side info card */}
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">Capacity</div>
              <div className="mb-2 text-[13px] font-semibold text-foreground">
                {event.seats_registered} / {event.max_seats} registered
              </div>
              <div className="h-2 w-full rounded-full bg-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.min(100, Math.round((event.seats_registered / event.max_seats) * 100))}%` }}
                />
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {event.max_seats - event.seats_registered} seats remaining
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <div className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">Quick Info</div>
              <div className="space-y-2 text-[13px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status={event.status} />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fee</span>
                  <span className="font-medium">{event.fee_paise !== null ? `₹${event.fee_paise / 100}` : 'Free'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Waiting</span>
                  <span className="font-medium">{event.waiting_count} on list</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'registrants' && (
        <div className="flex items-center justify-center rounded-xl border border-border bg-card py-16 text-[14px] text-muted-foreground">
          Registrant management coming soon
        </div>
      )}

      {activeTab === 'waiting-list' && (
        <div className="flex items-center justify-center rounded-xl border border-border bg-card py-16 text-[14px] text-muted-foreground">
          Waiting list management coming soon
        </div>
      )}

      {activeTab === 'invitations' && (
        <div className="flex items-center justify-center rounded-xl border border-border bg-card py-16 text-[14px] text-muted-foreground">
          Invitation management coming soon
        </div>
      )}

      {/* Edit modal */}
      {showEditModal && (
        <EditEventModal
          event={editEventItem}
          onClose={() => setShowEditModal(false)}
          onSuccess={async () => {
            setShowEditModal(false)
            // Re-fetch updated event data
            try {
              const res = await fetch(`/api/v1/events/${event.id}`)
              if (res.ok) {
                const json = await res.json() as { data: { event: EventDetail } }
                setEvent(json.data.event)
              }
            } catch { /* ignore */ }
          }}
        />
      )}

      {/* Cancel confirmation */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
            <h2 className="text-[16px] font-bold text-foreground">Cancel Event?</h2>
            <p className="mt-2 text-[13px] text-muted-foreground">
              This will cancel the event and notify all registered patients.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="rounded-md border border-border px-4 py-2 text-[13px] font-medium text-muted-foreground hover:bg-muted"
              >
                Keep Event
              </button>
              <button
                onClick={() => void handleCancel()}
                disabled={actionLoading}
                className="rounded-md bg-red-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {actionLoading ? 'Cancelling…' : 'Cancel Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
