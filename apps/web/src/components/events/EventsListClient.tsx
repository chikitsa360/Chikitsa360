'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@chikitsa360/core'
import type { EventAggregates } from '@/lib/events/aggregates'
import { NewEventModal } from './NewEventModal'
import { EditEventModal } from './EditEventModal'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EventItem {
  id: string
  title: string
  slug: string
  start_time: string
  end_time: string
  status: string
  max_seats: number
  seats_registered: number
  venue: string | null
  meeting_link: string | null
  fee_paise: number | null
  series_id: string | null
  series_position: number | null
  waiting_count: number
}

type FilterTab = 'all' | 'published' | 'draft' | 'completed' | 'cancelled'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupBySeries(events: EventItem[]): Array<{ type: 'standalone'; event: EventItem } | { type: 'series'; seriesId: string; events: EventItem[] }> {
  const seriesMap = new Map<string, EventItem[]>()
  const standalone: EventItem[] = []

  for (const ev of events) {
    if (ev.series_id) {
      const arr = seriesMap.get(ev.series_id) ?? []
      arr.push(ev)
      seriesMap.set(ev.series_id, arr)
    } else {
      standalone.push(ev)
    }
  }

  const result: Array<{ type: 'standalone'; event: EventItem } | { type: 'series'; seriesId: string; events: EventItem[] }> = []

  // Interleave: insert series rows in the position of their first event
  const processed = new Set<string>()
  for (const ev of events) {
    if (!ev.series_id) {
      result.push({ type: 'standalone', event: ev })
    } else if (!processed.has(ev.series_id)) {
      processed.add(ev.series_id)
      result.push({ type: 'series', seriesId: ev.series_id, events: seriesMap.get(ev.series_id) ?? [] })
    }
  }

  return result
}

function isToday(isoString: string): boolean {
  const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  const eventDate = new Date(new Date(isoString).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  return eventDate.toDateString() === nowIST.toDateString()
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatTime(start: string, end: string): string {
  const opts: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }
  const s = new Date(start).toLocaleTimeString('en-IN', opts)
  const e = new Date(end).toLocaleTimeString('en-IN', opts)
  return `${s} – ${e}`
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
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold', cfg[status] ?? 'bg-muted text-muted-foreground')}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

// ─── Seats progress bar ───────────────────────────────────────────────────────

function SeatsBar({ registered, max }: { registered: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((registered / max) * 100)) : 0
  const isFull = pct >= 100
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[13px] font-semibold text-foreground">
        {registered} <span className="text-[12px] font-normal text-muted-foreground">/ {max}</span>
      </div>
      <div className="h-1 w-full rounded-full bg-border overflow-hidden">
        <div
          className={cn('h-full rounded-full', isFull ? 'bg-amber-500' : 'bg-primary')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-[11px] text-muted-foreground">
        {isFull ? 'Full' : `${max - registered} remaining`}
      </div>
    </div>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className={cn('text-[28px] font-bold leading-none tabular-nums', color ?? 'text-foreground')}>
        {value}
      </div>
      <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  )
}

// ─── Filter tabs ──────────────────────────────────────────────────────────────

const TAB_LABELS: Record<FilterTab, string> = {
  all: 'All',
  published: 'Published',
  draft: 'Draft',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  initialAggregates: EventAggregates
}

export function EventsListClient({ initialAggregates }: Props) {
  const [aggregates, setAggregates] = React.useState(initialAggregates)
  const [activeTab, setActiveTab] = React.useState<FilterTab>('all')
  const [events, setEvents] = React.useState<EventItem[]>([])
  const [total, setTotal] = React.useState(0)
  const [page, setPage] = React.useState(1)
  const [loading, setLoading] = React.useState(false)
  const [expandedSeries, setExpandedSeries] = React.useState<Set<string>>(new Set())
  const [showNewModal, setShowNewModal] = React.useState(false)
  const [editingEvent, setEditingEvent] = React.useState<EventItem | null>(null)
  const [cancelConfirmId, setCancelConfirmId] = React.useState<string | null>(null)
  const [actionLoading, setActionLoading] = React.useState(false)
  const limit = 50

  const fetchEvents = React.useCallback(async (tab: FilterTab, pg: number) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(pg), limit: String(limit) })
      if (tab !== 'all') params.set('status', tab)
      const res = await fetch(`/api/v1/events?${params}`)
      if (res.ok) {
        const json = await res.json() as { data: { events: EventItem[]; total: number } }
        setEvents(json.data.events)
        setTotal(json.data.total)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshAggregates = React.useCallback(async () => {
    const res = await fetch('/api/v1/events?limit=1')
    if (res.ok) {
      // Re-fetch full aggregates from the page RSC would be ideal, but for simplicity
      // we re-fetch with status filters
      const [all, pub] = await Promise.all([
        fetch('/api/v1/events?limit=1'),
        fetch('/api/v1/events?status=published&limit=1'),
      ])
      if (all.ok && pub.ok) {
        const allData = await all.json() as { data: { total: number } }
        const pubData = await pub.json() as { data: { total: number } }
        setAggregates(prev => ({ ...prev, total: allData.data.total, published: pubData.data.total }))
      }
    }
  }, [])

  React.useEffect(() => {
    void fetchEvents(activeTab, 1)
    setPage(1)
  }, [activeTab, fetchEvents])

  const handleTabChange = (tab: FilterTab) => {
    setActiveTab(tab)
  }

  const toggleSeries = (seriesId: string) => {
    setExpandedSeries(prev => {
      const next = new Set(prev)
      if (next.has(seriesId)) next.delete(seriesId)
      else next.add(seriesId)
      return next
    })
  }

  const handlePublish = async (eventId: string) => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/v1/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish' }),
      })
      if (res.ok) {
        await fetchEvents(activeTab, page)
        await refreshAggregates()
      }
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancel = async (eventId: string) => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/v1/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      })
      if (res.ok) {
        setCancelConfirmId(null)
        await fetchEvents(activeTab, page)
        await refreshAggregates()
      }
    } finally {
      setActionLoading(false)
    }
  }

  const grouped = groupBySeries(events)
  const totalPages = Math.ceil(total / limit)

  const renderEventRow = (ev: EventItem, isChild = false) => (
    <div
      key={ev.id}
      className={cn(
        'grid items-center gap-0 border-b border-border px-4 transition-colors hover:bg-primary/[0.02]',
        isChild ? 'bg-muted/30' : '',
        'h-[60px]'
      )}
      style={{ gridTemplateColumns: '2fr 1.3fr 100px 160px 120px 80px' }}
    >
      {/* Event name */}
      <div>
        <div className={cn('flex items-center gap-2 text-[14px] font-semibold text-foreground', isChild && 'pl-6')}>
          {isChild && (
            <svg className="h-3.5 w-3.5 shrink-0 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M3 12h18" />
            </svg>
          )}
          <Link href={`/events/${ev.id}`} className="hover:text-primary hover:underline truncate max-w-[180px]">
            {ev.title}
          </Link>
          {isToday(ev.start_time) && (
            <span className="shrink-0 rounded-full bg-amber-50 px-1.5 py-px text-[10px] font-bold text-amber-700">TODAY</span>
          )}
        </div>
        {ev.venue && (
          <div className={cn('mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground', isChild && 'pl-6')}>
            <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
            </svg>
            <span className="truncate">{ev.venue}</span>
          </div>
        )}
        {ev.fee_paise === null && (
          <span className={cn('mt-0.5 inline-block rounded-full bg-secondary/10 px-2 py-px text-[10px] font-semibold text-secondary', isChild && 'ml-6')}>
            Free
          </span>
        )}
      </div>

      {/* Date/Time */}
      <div className="flex flex-col">
        <div className="text-[13px] font-semibold text-foreground">{formatDate(ev.start_time)}</div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">{formatTime(ev.start_time, ev.end_time)}</div>
      </div>

      {/* Status */}
      <div><StatusBadge status={ev.status} /></div>

      {/* Seats */}
      <div><SeatsBar registered={ev.seats_registered} max={ev.max_seats} /></div>

      {/* Waiting list */}
      <div className="text-[13px] text-muted-foreground">
        {ev.waiting_count > 0 ? (
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
            {ev.waiting_count} waiting
          </span>
        ) : '—'}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity [.group:hover_&]:opacity-100">
        <Link
          href={`/events/${ev.id}`}
          className="flex h-7 w-7 items-center justify-center rounded border border-border bg-card text-muted-foreground hover:border-primary hover:text-primary"
          title="View"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
          </svg>
        </Link>
        {(ev.status === 'draft' || ev.status === 'published') && (
          <button
            onClick={() => setEditingEvent(ev)}
            className="flex h-7 w-7 items-center justify-center rounded border border-border bg-card text-muted-foreground hover:border-primary hover:text-primary"
            title="Edit"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        )}
        {ev.status === 'draft' && (
          <button
            onClick={() => void handlePublish(ev.id)}
            disabled={actionLoading}
            className="flex h-7 w-7 items-center justify-center rounded border border-green-200 bg-card text-green-600 hover:border-green-400"
            title="Publish"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>
        )}
        {ev.status === 'published' && (
          <button
            onClick={() => setCancelConfirmId(ev.id)}
            className="flex h-7 w-7 items-center justify-center rounded border border-border bg-card text-red-500 hover:border-red-300"
            title="Cancel event"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Stat cards */}
      <div className="mb-5 grid grid-cols-4 gap-4">
        <StatCard label="Total Events" value={aggregates.total} color="text-primary" />
        <StatCard label="Published" value={aggregates.published} color="text-green-600" />
        <StatCard label="Upcoming" value={aggregates.upcoming} />
        <StatCard label="This Week" value={aggregates.thisWeek} color="text-violet-600" />
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
        <div className="flex rounded-md border border-border bg-muted p-0.5 gap-0.5">
          {(Object.keys(TAB_LABELS) as FilterTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={cn(
                'rounded px-3.5 py-1 text-[13px] font-medium transition-colors',
                activeTab === tab
                  ? 'bg-card text-primary font-semibold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-[13.5px] font-semibold text-white hover:bg-primary/90"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Event
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Table header */}
        <div
          className="grid items-center gap-0 border-b border-border bg-muted/50 px-4 h-10"
          style={{ gridTemplateColumns: '2fr 1.3fr 100px 160px 120px 80px' }}
        >
          {['Event', 'Date & Time', 'Status', 'Seats', 'Waiting', ''].map((h, i) => (
            <div key={i} className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{h}</div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-[13px] text-muted-foreground">Loading…</div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <svg className="h-10 w-10 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div className="text-[13px] font-medium text-muted-foreground">No events yet</div>
            <button
              onClick={() => setShowNewModal(true)}
              className="text-[13px] text-primary hover:underline font-medium"
            >
              Create your first event
            </button>
          </div>
        ) : (
          <div>
            {grouped.map((group, idx) => {
              if (group.type === 'standalone') {
                return (
                  <div key={group.event.id} className="group">
                    {renderEventRow(group.event, false)}
                  </div>
                )
              }

              // Series group
              const { seriesId, events: seriesEvents } = group
              const isExpanded = expandedSeries.has(seriesId)
              const firstEvent = seriesEvents[0]!
              const totalSeats = seriesEvents.reduce((a, e) => a + e.max_seats, 0)
              const totalRegistered = seriesEvents.reduce((a, e) => a + e.seats_registered, 0)
              const totalWaiting = seriesEvents.reduce((a, e) => a + e.waiting_count, 0)

              return (
                <div key={`series-${seriesId}-${idx}`}>
                  {/* Series header row */}
                  <div
                    className="grid cursor-pointer items-center gap-0 border-b border-border bg-primary/[0.02] px-4 h-11 hover:bg-primary/[0.04]"
                    style={{ gridTemplateColumns: '2fr 1.3fr 100px 160px 120px 80px' }}
                    onClick={() => toggleSeries(seriesId)}
                  >
                    <div className="flex items-center gap-2">
                      <svg
                        className={cn('h-4 w-4 text-muted-foreground transition-transform', isExpanded && 'rotate-180')}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                      <div>
                        <div className="text-[12px] font-semibold text-muted-foreground">{firstEvent.title.replace(/ — Session \d+$/, '')}</div>
                        <div className="text-[11px] text-muted-foreground">Series · {seriesEvents.length} occurrences</div>
                      </div>
                      <span className="rounded-full bg-primary/10 px-2 py-px text-[10px] font-bold text-primary">
                        {seriesEvents.length} events
                      </span>
                    </div>
                    <div />
                    <div />
                    <div className="text-[12px] text-muted-foreground">{totalRegistered} / {totalSeats} total seats</div>
                    <div className="text-[12px] text-muted-foreground">{totalWaiting > 0 ? `${totalWaiting} waiting` : '—'}</div>
                    <div />
                  </div>

                  {/* Series children */}
                  {isExpanded && seriesEvents.map(ev => (
                    <div key={ev.id} className="group">
                      {renderEventRow(ev, true)}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <div className="text-[12px] text-muted-foreground">
              Showing {events.length} of {total} events
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => { setPage(p => p - 1); void fetchEvents(activeTab, page - 1) }}
                disabled={page <= 1}
                className="flex h-8 w-8 items-center justify-center rounded border border-border text-[13px] text-muted-foreground disabled:opacity-40"
              >‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).slice(Math.max(0, page - 2), page + 1).map(pg => (
                <button
                  key={pg}
                  onClick={() => { setPage(pg); void fetchEvents(activeTab, pg) }}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded border text-[13px] font-medium',
                    pg === page ? 'border-primary bg-primary text-white' : 'border-border text-muted-foreground hover:bg-muted'
                  )}
                >{pg}</button>
              ))}
              <button
                onClick={() => { setPage(p => p + 1); void fetchEvents(activeTab, page + 1) }}
                disabled={page >= totalPages}
                className="flex h-8 w-8 items-center justify-center rounded border border-border text-[13px] text-muted-foreground disabled:opacity-40"
              >›</button>
            </div>
          </div>
        )}
      </div>

      {/* New Event Modal */}
      {showNewModal && (
        <NewEventModal
          onClose={() => setShowNewModal(false)}
          onSuccess={() => {
            setShowNewModal(false)
            void fetchEvents(activeTab, 1)
            void refreshAggregates()
          }}
        />
      )}

      {/* Edit Event Modal */}
      {editingEvent && (
        <EditEventModal
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
          onSuccess={() => {
            setEditingEvent(null)
            void fetchEvents(activeTab, page)
          }}
        />
      )}

      {/* Cancel confirmation dialog */}
      {cancelConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
            <h2 className="text-[16px] font-bold text-foreground">Cancel Event?</h2>
            <p className="mt-2 text-[13px] text-muted-foreground">
              This will cancel the event and notify all registered patients.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setCancelConfirmId(null)}
                className="rounded-md border border-border px-4 py-2 text-[13px] font-medium text-muted-foreground hover:bg-muted"
              >
                Keep Event
              </button>
              <button
                onClick={() => void handleCancel(cancelConfirmId)}
                disabled={actionLoading}
                className="rounded-md bg-red-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {actionLoading ? 'Cancelling…' : 'Cancel Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
