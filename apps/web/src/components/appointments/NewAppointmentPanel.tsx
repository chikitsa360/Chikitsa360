'use client'

import * as React from 'react'
import { PatientLookup, type PatientRecord } from './PatientLookup'
import { SlotGrid, type Slot } from '@/components/booking/SlotGrid'
import type { Doctor } from '@/app/(dashboard)/appointments/CalendarClient'
import { useToast } from '@/components/ui/ToastProvider'

interface NewAppointmentPanelProps {
  clinicId: string
  doctors: Doctor[]
  defaultDate: string
  onClose: () => void
  onCreated: (tokenNumber: number) => void
}

/**
 * Manual appointment creation modal (Story 5.2, UX-DR14).
 * Centered modal dialog. Phone-first patient lookup.
 */
export function NewAppointmentPanel({
  clinicId,
  doctors,
  defaultDate: _defaultDate,
  onClose,
  onCreated,
}: NewAppointmentPanelProps) {
  const { addToast } = useToast()
  const [phone, setPhone] = React.useState('')
  const [patientName, setPatientName] = React.useState('')
  const [nameError, setNameError] = React.useState('')
  const [existingPatient, setExistingPatient] = React.useState<PatientRecord | null>(null)

  const defaultDoctorId = doctors[0]?.id ?? ''
  const [selectedDoctorId, setSelectedDoctorId] = React.useState(defaultDoctorId)
  const [slots, setSlots] = React.useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = React.useState(false)
  const [selectedSlot, setSelectedSlot] = React.useState<Slot | null>(null)

  const [submitting, setSubmitting] = React.useState(false)
  const [slotError, setSlotError] = React.useState('')

  // Close on Escape
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Fetch slots when doctor changes
  React.useEffect(() => {
    if (!selectedDoctorId) return
    setLoadingSlots(true)
    setSelectedSlot(null)
    fetch(`/api/v1/slots/available?clinicId=${clinicId}&doctorId=${selectedDoctorId}&days=7`)
      .then((r) => r.json())
      .then((data: { slots?: Slot[] }) => setSlots(data.slots ?? []))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false))
  }, [clinicId, selectedDoctorId])

  function validateName(value: string): string {
    if (!value.trim()) return 'Name is required.'
    if (/^[\d\W]+$/.test(value.trim())) return 'Please enter a valid patient name.'
    return ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedSlot) { setSlotError('Please select a time slot.'); return }

    const nameErr = existingPatient ? '' : validateName(patientName)
    if (nameErr) { setNameError(nameErr); return }

    setSubmitting(true)
    setSlotError('')

    const body = existingPatient
      ? {
          patientId: existingPatient.id,
          doctorId: selectedSlot.doctorId,
          date: selectedSlot.date,
          startTime: selectedSlot.startTime,
          bookingSource: 'manual' as const,
        }
      : {
          newPatient: { name: patientName.trim(), phone },
          doctorId: selectedSlot.doctorId,
          date: selectedSlot.date,
          startTime: selectedSlot.startTime,
          bookingSource: 'manual' as const,
        }

    try {
      const res = await fetch('/api/v1/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.status === 409) {
        setSlotError('That slot was just taken. Please choose another time.')
        addToast({ variant: 'error', message: 'That slot was just taken. Please choose another time.' })
        setSelectedSlot(null)
        // Refresh slots
        fetch(`/api/v1/slots/available?clinicId=${clinicId}&doctorId=${selectedDoctorId}&days=7`)
          .then((r) => r.json())
          .then((data: { slots?: Slot[] }) => setSlots(data.slots ?? []))
          .catch(() => { /* ignore */ })
        return
      }

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        const msg = data.error ?? 'Something went wrong. Please try again.'
        setSlotError(msg)
        addToast({ variant: 'error', message: msg })
        return
      }

      const result = (await res.json()) as { tokenNumber: number }
      addToast({ variant: 'success', message: 'Appointment created successfully' })
      onCreated(result.tokenNumber)
    } catch {
      setSlotError('Something went wrong. Please try again.')
      addToast({ variant: 'error', message: 'Something went wrong. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        role="dialog"
        aria-label="New Appointment"
        className="flex w-full max-w-[680px] flex-col rounded-xl border border-border bg-card shadow-xl animate-in fade-in zoom-in-95 duration-200 max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <div className="flex-1 text-[18px] font-semibold text-foreground">New Appointment</div>
          <button onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Patient lookup + Doctor selector in a row on larger screens */}
            <div className="grid gap-5 sm:grid-cols-2">
              <PatientLookup
                phone={phone}
                name={patientName}
                nameError={nameError}
                onPhoneChange={(v) => { setPhone(v); setNameError('') }}
                onNameChange={(v) => { setPatientName(v); if (nameError) setNameError(validateName(v)) }}
                onPatientFound={setExistingPatient}
              />

              {/* Doctor selector */}
              {doctors.length > 1 && (
                <div>
                  <label className="block text-[13px] font-medium text-muted-foreground mb-1">Doctor</label>
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-card px-3 text-[14px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}{d.speciality ? ` — ${d.speciality.split(',').map((s) => s.trim()).filter(Boolean).join(', ')}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Slot grid */}
            <div>
              <label className="block text-[13px] font-medium text-muted-foreground mb-2">
                Available Slots{selectedDoctor ? ` — ${selectedDoctor.name}` : ''}
              </label>
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
                  onSelect={(slot) => { setSelectedSlot(slot); setSlotError('') }}
                />
              )}
              {slotError && <p className="mt-2 text-[12px] text-red-600">{slotError}</p>}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-border px-6 py-4">
            {selectedSlot && (
              <p className="mb-2 text-[12px] text-muted-foreground">
                {selectedSlot.doctorName} — {selectedSlot.date} at {selectedSlot.startTime}
              </p>
            )}
            <button
              type="submit"
              disabled={!selectedSlot || submitting || phone.length < 10}
              className="w-full h-[48px] rounded-lg bg-primary text-[14px] font-semibold text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Confirming…' : 'Confirm Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
