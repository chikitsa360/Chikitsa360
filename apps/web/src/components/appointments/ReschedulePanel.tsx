'use client'

import * as React from 'react'
import { SlotGrid, type Slot } from '@/components/booking/SlotGrid'
import type { Appointment } from '@/app/(dashboard)/appointments/CalendarClient'

interface ReschedulePanelProps {
  appointment: Appointment
  clinicId: string
  onClose: () => void
  onConfirm: (newDate: string, newTime: string) => Promise<{ error?: string }>
}

/**
 * Sub-panel for rescheduling an existing appointment (Story 5.4).
 * Shows slot grid for the same doctor, defaults to current appointment date.
 */
export function ReschedulePanel({ appointment, clinicId, onClose, onConfirm }: ReschedulePanelProps) {
  const [slots, setSlots] = React.useState<Slot[]>([])
  const [selectedSlot, setSelectedSlot] = React.useState<Slot | null>(null)
  const [loadingSlots, setLoadingSlots] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState('')
  const [showDialog, setShowDialog] = React.useState(false)

  React.useEffect(() => {
    setLoadingSlots(true)
    fetch(`/api/v1/appointments?date=${appointment.appointment_date}`)
      .catch(() => null)
      .finally(() => setLoadingSlots(false))

    // Fetch available slots using the internal API
    fetch(`/api/v1/slots/available?clinicId=${clinicId}&doctorId=${appointment.doctor_id}&days=7`)
      .then((r) => r.json())
      .then((data: { slots?: Slot[] }) => {
        // Exclude the current slot
        const normalizedTime = appointment.appointment_time?.slice(0, 5) ?? ''
        const filtered = (data.slots ?? []).filter(
          (s) =>
            !(s.date === appointment.appointment_date && s.startTime === normalizedTime)
        )
        setSlots(filtered)
      })
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false))
  }, [clinicId, appointment.doctor_id, appointment.appointment_date, appointment.appointment_time])

  async function handleConfirmReschedule() {
    if (!selectedSlot) return
    setSubmitting(true)
    setError('')
    const result = await onConfirm(selectedSlot.date, selectedSlot.startTime)
    if (result.error) {
      setError(result.error)
      // Refresh slots on slot-taken error
      if (result.error.includes('taken')) {
        const normalizedTime = appointment.appointment_time?.slice(0, 5) ?? ''
        fetch(`/api/v1/slots/available?clinicId=${clinicId}&doctorId=${appointment.doctor_id}&days=7`)
          .then((r) => r.json())
          .then((data: { slots?: Slot[] }) => {
            setSlots(
              (data.slots ?? []).filter(
                (s) => !(s.date === appointment.appointment_date && s.startTime === normalizedTime)
              )
            )
          })
          .catch(() => { /* ignore */ })
        setSelectedSlot(null)
      }
    }
    setSubmitting(false)
    setShowDialog(false)
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} aria-hidden="true" />

      {/* Panel */}
      <div
        role="dialog"
        aria-label="Reschedule Appointment"
        className="fixed right-0 top-0 bottom-0 z-[55] w-full max-w-[420px] bg-card shadow-xl flex flex-col border-l border-border"
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <div className="flex-1 text-[15px] font-semibold text-foreground">Reschedule Appointment</div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <p className="mb-3 text-[13px] text-muted-foreground">
            Select a new slot for <strong className="text-foreground">{appointment.patient_name}</strong>.
            Current: {appointment.appointment_date} at {appointment.appointment_time?.slice(0, 5)}.
          </p>

          {loadingSlots ? (
            <div className="flex justify-center py-8">
              <svg className="h-6 w-6 animate-spin text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </div>
          ) : (
            <SlotGrid
              slots={slots}
              selectedSlot={selectedSlot}
              onSelect={(slot) => { setSelectedSlot(slot); setError('') }}
            />
          )}

          {error && <p className="mt-3 text-[12px] text-red-600">{error}</p>}
        </div>

        <div className="border-t border-border px-4 py-3">
          {selectedSlot && (
            <p className="mb-2 text-[12px] text-muted-foreground">
              New slot: <strong className="text-foreground">{selectedSlot.date} at {selectedSlot.startTime}</strong>
            </p>
          )}
          <button
            onClick={() => setShowDialog(true)}
            disabled={!selectedSlot || submitting}
            className="w-full h-9 rounded-lg bg-primary text-[13px] font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            Confirm Reschedule
          </button>
        </div>
      </div>

      {/* Confirmation dialog */}
      {showDialog && selectedSlot && (
        <RescheduleConfirmDialog
          newDate={selectedSlot.date}
          newTime={selectedSlot.startTime}
          onConfirm={handleConfirmReschedule}
          onDismiss={() => setShowDialog(false)}
          submitting={submitting}
        />
      )}
    </>
  )
}

function RescheduleConfirmDialog({
  newDate,
  newTime,
  onConfirm,
  onDismiss,
  submitting,
}: {
  newDate: string
  newTime: string
  onConfirm: () => void
  onDismiss: () => void
  submitting: boolean
}) {
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Enter') onConfirm()
      if (e.key === 'Escape') onDismiss()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onConfirm, onDismiss])

  const [y, m, d] = newDate.split('-').map(Number)
  const dt = new Date(y ?? 0, (m ?? 1) - 1, d ?? 1)
  const dateLabel = dt.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
  const [hStr, mStr] = newTime.split(':')
  const h = parseInt(hStr ?? '0', 10)
  const period = h >= 12 ? 'PM' : 'AM'
  const timeLabel = `${h % 12 || 12}:${mStr ?? '00'} ${period}`

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onDismiss} aria-hidden="true" />
      <div
        role="dialog"
        className="fixed left-1/2 top-1/2 z-[65] w-full max-w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-card p-6 shadow-2xl border border-border"
      >
        <h2 className="text-[16px] font-semibold text-foreground mb-2">Confirm Reschedule</h2>
        <p className="text-[13px] text-muted-foreground mb-6">
          Reschedule to <strong className="text-foreground">{dateLabel} at {timeLabel}</strong>?{' '}
          A new WhatsApp confirmation will be sent to the patient.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onDismiss}
            className="flex-1 h-9 rounded-lg border border-border text-[13px] font-medium text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="flex-1 h-9 rounded-lg bg-primary text-[13px] font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            Confirm
          </button>
        </div>
      </div>
    </>
  )
}
