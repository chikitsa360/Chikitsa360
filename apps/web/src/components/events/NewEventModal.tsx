'use client'

import * as React from 'react'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { EventDetailsForm, defaultEventFormData, validateEventForm, buildEventPayload } from './EventDetailsForm'
import type { EventFormData, EventFormErrors } from './EventDetailsForm'

interface Props {
  onClose: () => void
  onSuccess: () => void
}

interface PatientResult {
  id: string
  name: string
  phone: string
  last_visit_date?: string | null
}

// ─── Step 2 — Invite Patients ────────────────────────────────────────────────

interface Step2Props {
  eventId: string
  onSkip: () => void
  onSendAndPublish: (selectedPatients: PatientResult[]) => Promise<void>
  submitting: boolean
  apiError: string | null
}

function Step2InvitePatients({ eventId, onSkip, onSendAndPublish, submitting, apiError }: Step2Props) {
  const [searchValue, setSearchValue] = React.useState('')
  const [results, setResults] = React.useState<PatientResult[]>([])
  const [searchLoading, setSearchLoading] = React.useState(false)
  const [selected, setSelected] = React.useState<PatientResult[]>([])
  const [selectError, setSelectError] = React.useState<string | null>(null)

  const debouncedQuery = useDebounce(searchValue, 300)

  React.useEffect(() => {
    if (debouncedQuery.length < 3) {
      setResults([])
      return
    }
    setSearchLoading(true)
    fetch(`/api/v1/patients/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then(r => r.json())
      .then((json: { data?: PatientResult[] }) => setResults(json.data ?? []))
      .catch(() => setResults([]))
      .finally(() => setSearchLoading(false))
  }, [debouncedQuery])

  const togglePatient = (patient: PatientResult) => {
    setSelectError(null)
    setSelected(prev => {
      const exists = prev.some(p => p.id === patient.id)
      return exists ? prev.filter(p => p.id !== patient.id) : [...prev, patient]
    })
  }

  const isSelected = (id: string) => selected.some(p => p.id === id)

  const maskPhone = (phone: string) => {
    if (phone.length <= 4) return `****`
    return `****${phone.slice(-4)}`
  }

  const handleSend = async () => {
    if (selected.length === 0) {
      setSelectError('Select at least one patient to send invitations')
      return
    }
    await onSendAndPublish(selected)
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      <p className="mb-4 text-[13px] text-muted-foreground">
        Search and select patients to invite. They&apos;ll receive a WhatsApp message with the registration link.
      </p>

      {/* Search input */}
      <div className="relative mb-3">
        <svg className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="Search by name or phone..."
          value={searchValue}
          onChange={e => setSearchValue(e.target.value)}
          className="h-10 w-full rounded-lg border border-border bg-background pl-8 pr-4 text-[13.5px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Search results dropdown */}
      {searchValue.length >= 3 && (
        <div className="mb-4 max-h-48 overflow-y-auto rounded-lg border border-border bg-card shadow-sm">
          {searchLoading ? (
            <div className="px-4 py-3 text-[13px] text-muted-foreground">Searching…</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-3 text-[13px] text-muted-foreground">No patients found</div>
          ) : (
            results.map(patient => (
              <button
                key={patient.id}
                onClick={() => togglePatient(patient)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted transition-colors border-b border-border last:border-0"
              >
                {/* Checkbox */}
                <div className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border-2 transition-colors ${isSelected(patient.id) ? 'border-primary bg-primary' : 'border-border'}`}>
                  {isSelected(patient.id) && (
                    <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground truncate">{patient.name}</p>
                  <p className="text-[12px] text-muted-foreground">{maskPhone(patient.phone)}{patient.last_visit_date ? ` · Last visit ${new Date(patient.last_visit_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}</p>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* Selected patients */}
      <div className="mb-2">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          {selected.length} patient{selected.length !== 1 ? 's' : ''} selected
        </p>
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selected.map(p => (
              <span key={p.id} className="inline-flex items-center gap-1.5 rounded-full bg-primary/[0.08] px-3 py-1 text-[12px] font-medium text-primary">
                {p.name}
                <button
                  onClick={() => togglePatient(p)}
                  className="text-primary/60 hover:text-primary"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {selectError && (
        <div className="mt-3 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-[13px] text-red-700">
          {selectError}
        </div>
      )}

      {apiError && (
        <div className="mt-3 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-[13px] text-red-700">
          {apiError}
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 flex items-center gap-3 border-t border-border pt-4">
        <button
          onClick={onSkip}
          disabled={submitting}
          className="rounded-md border border-border px-4 py-2 text-[13.5px] font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
        >
          Skip for now
        </button>
        <div className="flex-1" />
        <button
          onClick={() => void handleSend()}
          disabled={submitting}
          className="rounded-md bg-primary px-4 py-2 text-[13.5px] font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {submitting ? 'Sending…' : `Send Invitations & Publish`}
        </button>
      </div>

      {/* Suppress unused eventId warning */}
      <span className="sr-only">{eventId}</span>
    </div>
  )
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function NewEventModal({ onClose, onSuccess }: Props) {
  const [step, setStep] = React.useState<1 | 2>(1)
  const [createdEventId, setCreatedEventId] = React.useState<string | null>(null)
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
    const cleared: EventFormErrors = { ...errors }
    for (const key of Object.keys(updates)) {
      delete cleared[key as keyof EventFormErrors]
    }
    setErrors(cleared)
  }

  // Step 1: Save as Draft → close
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

  // Step 1 → Step 2: save event and advance
  const handleNextStep = async () => {
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

      const json = await res.json() as { data: { event?: { id: string }; events?: { id: string }[] } }
      const eventId = json.data.event?.id ?? json.data.events?.[0]?.id
      if (eventId) {
        setCreatedEventId(eventId)
        setStep(2)
      } else {
        onSuccess()
      }
    } catch {
      setApiError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Step 2: Send invitations + publish
  const handleSendAndPublish = async (selectedPatients: { id: string }[]) => {
    if (!createdEventId) return
    setSubmitting(true)
    setApiError(null)
    try {
      // Send invitations
      const invRes = await fetch(`/api/v1/events/${createdEventId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientIds: selectedPatients.map(p => p.id) }),
      })
      if (!invRes.ok) {
        const json = await invRes.json() as { error?: { message?: string } }
        setApiError(json.error?.message ?? 'Failed to send invitations')
        return
      }

      // Publish the event
      const pubRes = await fetch(`/api/v1/events/${createdEventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish' }),
      })
      if (!pubRes.ok) {
        setApiError('Event created but could not be published. Please publish from the event page.')
        return
      }

      onSuccess()
    } catch {
      setApiError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Step 2: Skip
  const handleSkip = () => {
    onSuccess()
  }

  const stepLabel = step === 1 ? 'Event details' : 'Invite patients'

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
            <p className="text-[13px] text-muted-foreground">Step {step} of 2 — {stepLabel}</p>
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
            <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold ${step >= 1 ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
              {step > 1 ? (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : '1'}
            </div>
            <span className={`text-[12px] font-semibold ${step === 1 ? 'text-primary' : 'text-muted-foreground'}`}>Event Details</span>
          </div>
          <div className="mx-3 h-px flex-1 bg-border" />
          <div className="flex items-center gap-2">
            <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold ${step === 2 ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>2</div>
            <span className={`text-[12px] font-semibold ${step === 2 ? 'text-primary' : 'text-muted-foreground'}`}>Invite Patients</span>
          </div>
        </div>

        {/* Step 1 body */}
        {step === 1 && (
          <>
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
                onClick={() => void handleNextStep()}
                disabled={submitting}
                className="rounded-md bg-primary px-4 py-2 text-[13.5px] font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting ? 'Saving…' : 'Next: Invite Patients →'}
              </button>
            </div>
          </>
        )}

        {/* Step 2 body */}
        {step === 2 && createdEventId && (
          <Step2InvitePatients
            eventId={createdEventId}
            onSkip={handleSkip}
            onSendAndPublish={handleSendAndPublish}
            submitting={submitting}
            apiError={apiError}
          />
        )}
      </div>
    </div>
  )
}
