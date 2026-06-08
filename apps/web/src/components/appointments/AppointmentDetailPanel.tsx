'use client'

import * as React from 'react'
import { statusBadgeClass } from './AppointmentCard'
import { ReschedulePanel } from './ReschedulePanel'
import { CancelDialog } from './CancelDialog'
import type { Appointment } from '@/app/(dashboard)/appointments/CalendarClient'

interface AppointmentDetailPanelProps {
  appointment: Appointment
  clinicId: string
  onClose: () => void
  onReschedule: (id: string, newDate: string, newTime: string) => Promise<Response>
  onCancel: (id: string) => Promise<Response>
  onMarkComplete: (id: string) => Promise<Response>
  onMarkNoShow: (id: string) => Promise<Response>
}

function formatTime(time: string | null): string {
  if (!time) return '—'
  const [hStr, mStr] = time.split(':')
  const h = parseInt(hStr ?? '0', 10)
  const m = mStr?.slice(0, 2) ?? '00'
  const period = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${m} ${period}`
}

function maskPhone(phone: string): string {
  if (phone.length < 4) return phone
  return `+91 XXXXXX${phone.slice(-4)}`
}

function bookingSourceLabel(source: string): string {
  const map: Record<string, string> = {
    whatsapp: 'WhatsApp',
    web: 'Web Booking',
    'walk-in': 'Walk-in',
    'walk-in-overflow': 'Walk-in (Overflow)',
    manual: 'Manual Entry',
  }
  return map[source] ?? source
}

export function AppointmentDetailPanel({
  appointment,
  clinicId,
  onClose,
  onReschedule,
  onCancel,
  onMarkComplete,
  onMarkNoShow,
}: AppointmentDetailPanelProps) {
  const [showReschedule, setShowReschedule] = React.useState(false)
  const [showCancelDialog, setShowCancelDialog] = React.useState(false)
  const [actionError, setActionError] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  // Close on Escape key
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleMarkComplete() {
    setSubmitting(true)
    setActionError('')
    const res = await onMarkComplete(appointment.id)
    if (!res.ok) setActionError('Failed to mark complete.')
    setSubmitting(false)
  }

  async function handleMarkNoShow() {
    setSubmitting(true)
    setActionError('')
    const res = await onMarkNoShow(appointment.id)
    if (!res.ok) setActionError('Failed to mark no-show.')
    setSubmitting(false)
  }

  const canModify = appointment.status === 'confirmed'

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel — right side on desktop, bottom sheet feel on mobile */}
      <div
        role="dialog"
        aria-label="Appointment Details"
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[400px] bg-card shadow-xl flex flex-col border-l border-border animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <div className="flex-1">
            <div className="text-[16px] font-semibold text-foreground">{appointment.patient_name}</div>
            <div className="text-[12px] text-muted-foreground">{maskPhone(appointment.patient_phone)}</div>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusBadgeClass(appointment.status)}`}>
            {appointment.status === 'no-show' ? 'No-show' : appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
          </span>
          <button
            onClick={onClose}
            aria-label="Close panel"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Token */}
          {appointment.token_number !== null && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Token</div>
              <div className="text-[28px] font-bold text-primary">#{appointment.token_number}</div>
            </div>
          )}

          {/* Details */}
          <div className="space-y-3">
            <DetailRow label="Doctor" value={appointment.doctor_name} />
            <DetailRow label="Date" value={formatDateLabel(appointment.appointment_date)} />
            <DetailRow label="Time" value={formatTime(appointment.appointment_time)} />
            <DetailRow label="Source" value={bookingSourceLabel(appointment.booking_source)} />
          </div>

          {actionError && (
            <p className="text-[12px] text-red-600">{actionError}</p>
          )}
        </div>

        {/* Actions */}
        <div className="border-t border-border px-4 py-3 space-y-2">
          {canModify && (
            <>
              <button
                onClick={() => setShowReschedule(true)}
                disabled={submitting}
                className="w-full h-9 rounded-lg border border-border bg-card text-[13px] font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                Reschedule
              </button>
              <button
                onClick={handleMarkComplete}
                disabled={submitting}
                className="w-full h-9 rounded-lg bg-green-600 text-[13px] font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                Mark Complete
              </button>
              <button
                onClick={handleMarkNoShow}
                disabled={submitting}
                className="w-full h-9 rounded-lg border border-amber-300 bg-amber-50 text-[13px] font-medium text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
              >
                Mark No-Show
              </button>
              <button
                onClick={() => setShowCancelDialog(true)}
                disabled={submitting}
                className="w-full h-9 rounded-lg border border-red-200 bg-red-50 text-[13px] font-medium text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                Cancel Appointment
              </button>
            </>
          )}
        </div>
      </div>

      {/* Reschedule sub-panel */}
      {showReschedule && (
        <ReschedulePanel
          appointment={appointment}
          clinicId={clinicId}
          onClose={() => setShowReschedule(false)}
          onConfirm={async (newDate, newTime) => {
            const res = await onReschedule(appointment.id, newDate, newTime)
            if (res.ok) {
              setShowReschedule(false)
            } else {
              const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string }
              if (data.error === 'SLOT_TAKEN') {
                return { error: data.message ?? 'That slot was just taken.' }
              }
              return { error: 'Reschedule failed. Please try again.' }
            }
            return {}
          }}
        />
      )}

      {/* Cancel confirmation dialog */}
      {showCancelDialog && (
        <CancelDialog
          patientName={appointment.patient_name}
          onConfirm={async () => {
            const res = await onCancel(appointment.id)
            if (!res.ok) return { error: 'Failed to cancel appointment.' }
            setShowCancelDialog(false)
            return {}
          }}
          onDismiss={() => setShowCancelDialog(false)}
        />
      )}
    </>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">{label}</div>
      <div className="text-[13px] font-medium text-foreground">{value}</div>
    </div>
  )
}

function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y ?? 0, (m ?? 1) - 1, d ?? 1)
  return dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}
