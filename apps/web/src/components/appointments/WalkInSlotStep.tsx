'use client'

import * as React from 'react'
import { SlotGrid, type Slot } from '@/components/booking/SlotGrid'
import { OverflowWarningBanner } from './OverflowWarningBanner'
import type { Doctor } from '@/app/(dashboard)/appointments/CalendarClient'

interface WalkInSlotStepProps {
  clinicId: string
  doctors: Doctor[]
  selectedDoctorId: string
  onDoctorChange: (id: string) => void
  onBack: () => void
  onConfirm: (slot: Slot, isOverflow: boolean) => Promise<{ error?: string }>
}

export function WalkInSlotStep({
  clinicId,
  doctors,
  selectedDoctorId,
  onDoctorChange,
  onBack,
  onConfirm,
}: WalkInSlotStepProps) {
  const [slots, setSlots] = React.useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = React.useState(false)
  const [nextSlot, setNextSlot] = React.useState<Slot | null>(null)
  const [selectedSlot, setSelectedSlot] = React.useState<Slot | null>(null)
  const [fullyBooked, setFullyBooked] = React.useState(false)
  const [showOverflowWarning, setShowOverflowWarning] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState('')

  // Fetch slots when doctor changes
  React.useEffect(() => {
    if (!selectedDoctorId) return
    setLoadingSlots(true)
    setSelectedSlot(null)
    setNextSlot(null)
    setFullyBooked(false)
    setShowOverflowWarning(false)

    const now = new Date()
    const fromTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    Promise.all([
      fetch(`/api/v1/slots/available?clinicId=${clinicId}&doctorId=${selectedDoctorId}&days=7`)
        .then((r) => r.json()) as Promise<{ slots?: Slot[] }>,
      fetch(`/api/v1/slots/next-available?doctorId=${selectedDoctorId}&fromTime=${fromTime}`)
        .then((r) => r.json()) as Promise<{ slot: Slot | null; fullyBooked: boolean }>,
    ])
      .then(([slotsData, nextData]) => {
        setSlots(slotsData.slots ?? [])
        setNextSlot(nextData.slot)
        setFullyBooked(nextData.fullyBooked)
      })
      .catch(() => { /* ignore */ })
      .finally(() => setLoadingSlots(false))
  }, [clinicId, selectedDoctorId])

  function handleAssignNextAvailable() {
    if (fullyBooked) {
      setShowOverflowWarning(true)
      return
    }
    if (nextSlot) {
      setSelectedSlot(nextSlot)
    }
  }

  async function handleConfirm(isOverflow = false) {
    if (!selectedSlot) return
    setSubmitting(true)
    setError('')
    const result = await onConfirm(selectedSlot, isOverflow)
    if (result.error) {
      setError(result.error)
      setSelectedSlot(null)
    }
    setSubmitting(false)
    setShowOverflowWarning(false)
  }

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId)

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Doctor selector (multi-doctor only) */}
        {doctors.length > 1 && (
          <div>
            <label className="block text-[13px] font-medium text-muted-foreground mb-1">Doctor</label>
            <select
              value={selectedDoctorId}
              onChange={(e) => onDoctorChange(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-card px-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Assign next available button */}
        <button
          type="button"
          onClick={handleAssignNextAvailable}
          disabled={loadingSlots}
          className="w-full h-[52px] rounded-lg bg-primary text-[14px] font-semibold text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loadingSlots ? 'Loading slots…' : 'Assign Next Available Slot'}
        </button>

        {/* Overflow warning */}
        {showOverflowWarning && (
          <OverflowWarningBanner
            doctorName={selectedDoctor?.name ?? 'Doctor'}
            onOverride={() => {
              // Create overflow booking with first slot of the day (even if full)
              // We use the first slot from the grid as the overflow target
              const overflowSlot = slots[0] ?? null
              if (overflowSlot) {
                setSelectedSlot(overflowSlot)
                setShowOverflowWarning(false)
              }
            }}
            onCancel={() => setShowOverflowWarning(false)}
          />
        )}

        {/* Selected slot indicator */}
        {selectedSlot && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
            <div className="text-[11px] text-primary font-semibold uppercase tracking-wide mb-0.5">Walk-In Slot</div>
            <div className="text-[13px] font-medium text-foreground">
              {selectedSlot.startTime} — {selectedDoctor?.name ?? ''} today
            </div>
            {nextSlot && selectedSlot.startTime === nextSlot.startTime && (
              <div className="text-[11px] text-muted-foreground mt-0.5">Auto-selected</div>
            )}
          </div>
        )}

        {/* Slot grid (manual selection) */}
        <div>
          <div className="mb-2 text-[12px] font-medium text-muted-foreground">Or select manually:</div>
          {loadingSlots ? (
            <div className="flex justify-center py-6">
              <svg className="h-5 w-5 animate-spin text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
              </svg>
            </div>
          ) : (
            <SlotGrid
              slots={slots}
              selectedSlot={selectedSlot}
              onSelect={(s) => { setSelectedSlot(s); setError('') }}
            />
          )}
        </div>

        {error && <p className="text-[12px] text-red-600">{error}</p>}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-4 py-3 flex gap-2">
        <button
          type="button"
          onClick={onBack}
          className="h-10 px-4 rounded-lg border border-border text-[13px] font-medium text-foreground hover:bg-muted transition-colors"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={() => void handleConfirm(false)}
          disabled={!selectedSlot || submitting}
          className="flex-1 h-10 rounded-lg bg-primary text-[14px] font-semibold text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Confirming…' : 'Confirm Walk-In'}
        </button>
      </div>
    </div>
  )
}
