'use client'

import * as React from 'react'

interface CancelDialogProps {
  patientName: string
  onConfirm: () => Promise<{ error?: string }>
  onDismiss: () => void
}

/**
 * Confirmation modal for appointment cancellation (UX-DR22).
 * Primary destructive action is red-filled. Keyboard: Enter = confirm, Escape = dismiss.
 */
export function CancelDialog({ patientName, onConfirm, onDismiss }: CancelDialogProps) {
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Enter' && !submitting) void handleConfirm()
      if (e.key === 'Escape') onDismiss()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [submitting, onDismiss]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleConfirm() {
    setSubmitting(true)
    setError('')
    const result = await onConfirm()
    if (result.error) {
      setError(result.error)
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onDismiss} aria-hidden="true" />
      <div
        role="alertdialog"
        aria-label="Cancel Appointment"
        className="fixed left-1/2 top-1/2 z-[65] w-full max-w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-card p-6 shadow-2xl border border-border"
      >
        <h2 className="text-[16px] font-semibold text-foreground mb-2">Cancel Appointment?</h2>
        <p className="text-[13px] text-muted-foreground mb-4">
          A cancellation notification will be sent to <strong className="text-foreground">{patientName}</strong>.
        </p>
        {error && <p className="mb-3 text-[12px] text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={onDismiss}
            disabled={submitting}
            className="flex-1 h-9 rounded-lg border border-border text-[13px] font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            Keep
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="flex-1 h-9 rounded-lg bg-red-600 text-[13px] font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Cancelling…' : 'Cancel Appointment'}
          </button>
        </div>
      </div>
    </>
  )
}
