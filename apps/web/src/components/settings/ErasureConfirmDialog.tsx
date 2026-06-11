'use client'

import * as React from 'react'

interface PatientInfo {
  id: string
  name: string
  phone: string | null
}

interface ErasureConfirmDialogProps {
  patient: PatientInfo | null
  onConfirm: (patientId: string) => Promise<void>
  onClose: () => void
}

export function ErasureConfirmDialog({ patient, onConfirm, onClose }: ErasureConfirmDialogProps) {
  const [confirmText, setConfirmText] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (!patient) setConfirmText('')
  }, [patient])

  if (!patient) return null

  const canErase = confirmText === 'DELETE'

  async function handleErase() {
    if (!canErase) return
    setLoading(true)
    try {
      await onConfirm(patient!.id)
      setConfirmText('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-card shadow-xl">
        {/* Red header */}
        <div className="flex items-center gap-2.5 border-b border-red-100 bg-red-50 px-5 py-4">
          <svg className="h-5 w-5 shrink-0 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M12 9v3m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <h2 className="text-[15px] font-semibold text-red-800">Erase Patient Data</h2>
        </div>

        <div className="px-5 py-5 space-y-4">
          {/* Patient info */}
          <div className="text-[13px] text-foreground">
            <span className="font-medium">{patient.name}</span>
            {patient.phone && <span className="ml-2 text-muted-foreground">{patient.phone}</span>}
          </div>

          {/* Warning block */}
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-[13px] text-neutral-700">
            This action permanently removes all personal information for this patient. Appointment history is
            retained for audit purposes. <strong>This cannot be undone.</strong>
          </div>

          {/* Type DELETE input */}
          <div className="space-y-1.5">
            <label className="block text-[12px] font-medium text-foreground">
              Type <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">DELETE</code> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-[13px] outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              autoComplete="off"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2.5 border-t border-border px-5 py-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-md border border-border bg-background px-4 py-1.5 text-[13px] font-medium text-foreground hover:bg-muted disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleErase}
            disabled={!canErase || loading}
            className="rounded-md bg-red-600 px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? 'Erasing…' : 'Erase Patient Data'}
          </button>
        </div>
      </div>
    </div>
  )
}
