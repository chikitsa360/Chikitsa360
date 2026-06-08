'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

interface DuplicatePatientPromptProps {
  patient: { id: string; name: string; created_at: string }
  onClose: () => void
  onAddAnyway: () => void
}

export function DuplicatePatientPrompt({ patient, onClose, onAddAnyway }: DuplicatePatientPromptProps) {
  const router = useRouter()
  const lastSeen = new Date(patient.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-amber-50">
          <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>

        <h3 className="text-[15px] font-semibold text-foreground">Patient already exists</h3>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          A patient with this number already exists:{' '}
          <span className="font-medium text-foreground">{patient.name}</span>, registered {lastSeen}.
          View their profile?
        </p>

        <div className="mt-5 flex flex-col gap-2">
          <button
            onClick={() => router.push(`/patients/${patient.id}`)}
            className="h-9 w-full rounded-md bg-primary text-[13px] font-medium text-white hover:bg-primary/90 transition-colors"
          >
            View Profile
          </button>
          <button
            onClick={onAddAnyway}
            className="h-8 w-full rounded-md border border-border text-[11px] font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            Add Anyway (not recommended)
          </button>
        </div>
      </div>
    </div>
  )
}
