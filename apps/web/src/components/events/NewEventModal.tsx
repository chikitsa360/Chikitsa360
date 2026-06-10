'use client'

import * as React from 'react'
import { EventDetailsForm, defaultEventFormData, validateEventForm, buildEventPayload } from './EventDetailsForm'
import type { EventFormData, EventFormErrors } from './EventDetailsForm'

interface Props {
  onClose: () => void
  onSuccess: () => void
}

export function NewEventModal({ onClose, onSuccess }: Props) {
  const [step] = React.useState<1 | 2>(1)
  const [formData, setFormData] = React.useState<EventFormData>(defaultEventFormData())
  const [errors, setErrors] = React.useState<EventFormErrors>({})
  const [submitting, setSubmitting] = React.useState(false)
  const [apiError, setApiError] = React.useState<string | null>(null)

  // Close on Escape
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleChange = (updates: Partial<EventFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
    // Clear errors for changed fields
    const cleared: EventFormErrors = { ...errors }
    for (const key of Object.keys(updates)) {
      delete cleared[key as keyof EventFormErrors]
    }
    setErrors(cleared)
  }

  const handleSaveDraft = async () => {
    const errs = validateEventForm(formData)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setSubmitting(true)
    setApiError(null)
    try {
      const payload = buildEventPayload(formData)
      const res = await fetch('/api/v1/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const json = await res.json() as { error?: { code?: string; message?: string } }
        setApiError(json.error?.message ?? 'Failed to create event')
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
              <path d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              <path d="M9 16l2 2 4-4" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-[17px] font-bold text-foreground">Create New Event</h2>
            <p className="text-[13px] text-muted-foreground">Step {step} of 2 — Event details</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground hover:bg-muted/80 text-[14px]"
          >
            ✕
          </button>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-0 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-white">1</div>
            <span className="text-[12px] font-semibold text-primary">Event Details</span>
          </div>
          <div className="mx-3 h-px flex-1 bg-border" />
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[12px] font-bold text-muted-foreground">2</div>
            <span className="text-[12px] font-semibold text-muted-foreground">Invite Patients</span>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-2">
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
            onClick={() => void handleSaveDraft()}
            disabled={submitting}
            className="rounded-md border border-border px-4 py-2 text-[13.5px] font-semibold text-foreground hover:bg-muted disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Save as Draft'}
          </button>
          <button
            disabled
            className="rounded-md bg-primary px-4 py-2 text-[13.5px] font-semibold text-white opacity-50 cursor-not-allowed"
            title="Invite Patients step is available after creating the event"
          >
            Next: Invite Patients →
          </button>
        </div>
      </div>
    </div>
  )
}
