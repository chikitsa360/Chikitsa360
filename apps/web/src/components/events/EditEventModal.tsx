'use client'

import * as React from 'react'
import { cn } from '@chikitsa360/core'
import { EventDetailsForm, validateEventForm, buildEventPayload } from './EventDetailsForm'
import type { EventFormData, EventFormErrors } from './EventDetailsForm'
import type { EventItem } from './EventsListClient'

// ─── Scope types ──────────────────────────────────────────────────────────────

type EditScope = 'single' | 'this-and-future' | 'all'

const SCOPE_LABELS: Record<EditScope, string> = {
  single: 'This event only',
  'this-and-future': 'This and future events',
  all: 'All events in series',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function eventToFormData(event: EventItem): EventFormData {
  const start = new Date(event.start_time)
  const end = new Date(event.end_time)

  // Format as IST for date/time inputs
  const toIST = (d: Date) => new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  const startIST = toIST(start)
  const endIST = toIST(end)

  const pad2 = (n: number) => String(n).padStart(2, '0')
  const date = `${startIST.getFullYear()}-${pad2(startIST.getMonth() + 1)}-${pad2(startIST.getDate())}`
  const startTime = `${pad2(startIST.getHours())}:${pad2(startIST.getMinutes())}`
  const endTime = `${pad2(endIST.getHours())}:${pad2(endIST.getMinutes())}`

  return {
    title: event.title,
    description: '',
    date,
    startTime,
    endTime,
    registrationDeadline: '',
    venue: event.venue ?? '',
    meetingLink: event.meeting_link ?? '',
    maxSeats: String(event.max_seats),
    feeRupees: event.fee_paise !== null ? String(event.fee_paise / 100) : '',
    recurrenceEnabled: false,
    recurrenceType: 'weekly',
    recurrenceDayOfWeek: null,
    recurrenceOccurrences: '8',
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  event: EventItem
  onClose: () => void
  onSuccess: () => void
}

export function EditEventModal({ event, onClose, onSuccess }: Props) {
  const [formData, setFormData] = React.useState<EventFormData>(() => eventToFormData(event))
  const [errors, setErrors] = React.useState<EventFormErrors>({})
  const [scope, setScope] = React.useState<EditScope>('single')
  const [submitting, setSubmitting] = React.useState(false)
  const [apiError, setApiError] = React.useState<string | null>(null)

  const isSeries = !!event.series_id

  // Close on Escape
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleChange = (updates: Partial<EventFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
    const cleared: EventFormErrors = { ...errors }
    for (const key of Object.keys(updates)) delete cleared[key as keyof EventFormErrors]
    setErrors(cleared)
  }

  const handleSave = async () => {
    const errs = validateEventForm(formData)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setSubmitting(true)
    setApiError(null)
    try {
      const payload = buildEventPayload(formData)
      const res = await fetch(`/api/v1/events/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope, ...payload }),
      })

      if (!res.ok) {
        const json = await res.json() as { error?: { code?: string; message?: string } }
        if (json.error?.code === 'SEATS_BELOW_REGISTERED') {
          setErrors({ maxSeats: json.error.message ?? 'Cannot reduce seats below current registrations' })
        } else {
          setApiError(json.error?.message ?? 'Failed to update event')
        }
        return
      }

      onSuccess()
    } catch {
      setApiError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="flex w-full max-w-[720px] max-h-[92vh] flex-col rounded-xl border border-border bg-card shadow-2xl">

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-6 py-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/[0.08]">
            <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-[17px] font-bold text-foreground">Edit Event</h2>
            <p className="text-[13px] text-muted-foreground truncate max-w-[420px]">{event.title}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground hover:bg-muted/80 text-[14px]"
          >✕</button>
        </div>

        {/* Series scope selector (only for series events) */}
        {isSeries && (
          <div className="border-b border-border px-6 py-4">
            <div className="mb-2 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Edit scope</div>
            <div className="flex gap-2">
              {(Object.keys(SCOPE_LABELS) as EditScope[]).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScope(s)}
                  className={cn(
                    'rounded-md border px-3 py-1.5 text-[12.5px] font-medium',
                    scope === s
                      ? 'border-primary bg-primary/[0.06] text-primary font-semibold'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  )}
                >
                  {SCOPE_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <EventDetailsForm
            data={formData}
            errors={errors}
            onChange={handleChange}
            disabled={submitting}
          />

          {apiError && (
            <div className="mt-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-[13px] text-red-700">
              {apiError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 border-t border-border px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-[13.5px] font-medium text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <div className="flex-1" />
          <button
            onClick={() => void handleSave()}
            disabled={submitting}
            className="rounded-md bg-primary px-5 py-2 text-[13.5px] font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
