'use client'

import * as React from 'react'
import { WalkInPatientStep } from './WalkInPatientStep'
import { WalkInSlotStep } from './WalkInSlotStep'
import { WalkInSuccessScreen } from './WalkInSuccessScreen'
import type { PatientRecord } from './PatientLookup'
import type { Slot } from '@/components/booking/SlotGrid'
import type { Doctor } from '@/app/(dashboard)/appointments/CalendarClient'

interface WalkInPanelProps {
  clinicId: string
  doctors: Doctor[]
  onClose: () => void
  onCreated: () => void
}

interface WalkInResult {
  tokenNumber: number
  patientName: string
  doctorName: string
  time: string
  isOverflow: boolean
}

/**
 * Walk-In Registration panel (Story 5.3, UX-DR15).
 * 2-step flow: Step 1 (Patient) → Step 2 (Slot) → Success Screen.
 */
export function WalkInPanel({ clinicId, doctors, onClose, onCreated }: WalkInPanelProps) {
  const [step, setStep] = React.useState<1 | 2 | 'success'>(1)
  const [phone, setPhone] = React.useState('')
  const [patientName, setPatientName] = React.useState('')
  const [existingPatient, setExistingPatient] = React.useState<PatientRecord | null>(null)
  const [selectedDoctorId, setSelectedDoctorId] = React.useState(doctors[0]?.id ?? '')
  const [result, setResult] = React.useState<WalkInResult | null>(null)

  // Close on Escape
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && step !== 'success') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, step])

  async function handleConfirmSlot(slot: Slot, isOverflow: boolean) {
    const bookingSource = isOverflow ? 'walk-in-overflow' : 'walk-in'
    const doctor = doctors.find((d) => d.id === selectedDoctorId)

    const body = existingPatient
      ? { patientId: existingPatient.id, doctorId: selectedDoctorId, date: slot.date, startTime: slot.startTime, bookingSource }
      : { newPatient: { name: patientName.trim(), phone }, doctorId: selectedDoctorId, date: slot.date, startTime: slot.startTime, bookingSource }

    const res = await fetch('/api/v1/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string }
      return { error: data.message ?? data.error ?? 'Booking failed.' }
    }

    const data = (await res.json()) as { tokenNumber: number }
    const [hStr, mStr] = slot.startTime.split(':')
    const h = parseInt(hStr ?? '0', 10)
    const period = h >= 12 ? 'PM' : 'AM'
    const timeLabel = `${h % 12 || 12}:${mStr ?? '00'} ${period}`

    setResult({
      tokenNumber: data.tokenNumber,
      patientName: existingPatient?.name ?? patientName,
      doctorName: doctor?.name ?? '',
      time: timeLabel,
      isOverflow,
    })
    setStep('success')
    onCreated()
    return {}
  }

  function resetToStep1() {
    setStep(1)
    setPhone('')
    setPatientName('')
    setExistingPatient(null)
    setResult(null)
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={step !== 'success' ? onClose : undefined} aria-hidden="true" />
      <div
        role="dialog"
        aria-label="Walk-In Registration"
        className="fixed right-0 top-0 bottom-0 z-50 flex w-full max-w-[420px] flex-col bg-card shadow-xl border-l border-border animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        {step !== 'success' && (
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <div className="flex-1 text-[18px] font-semibold text-foreground">Walk-In Registration</div>

            {/* Step indicator */}
            <div className="flex items-center gap-2 text-[12px]">
              <span className={`font-medium ${step === 1 ? 'text-primary border-b-2 border-primary pb-0.5' : 'text-muted-foreground'}`}>
                1 Patient
              </span>
              <span className="text-border">›</span>
              <span className={`font-medium ${step === 2 ? 'text-primary border-b-2 border-primary pb-0.5' : 'text-muted-foreground'}`}>
                2 Slot
              </span>
            </div>

            <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
          </div>
        )}

        {/* Step content */}
        {step === 1 && (
          <WalkInPatientStep
            phone={phone}
            name={patientName}
            existingPatient={existingPatient}
            onPhoneChange={setPhone}
            onNameChange={setPatientName}
            onPatientFound={setExistingPatient}
            onNext={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <WalkInSlotStep
            clinicId={clinicId}
            doctors={doctors}
            selectedDoctorId={selectedDoctorId}
            onDoctorChange={setSelectedDoctorId}
            onBack={() => setStep(1)}
            onConfirm={handleConfirmSlot}
          />
        )}

        {step === 'success' && result && (
          <WalkInSuccessScreen
            tokenNumber={result.tokenNumber}
            patientName={result.patientName}
            doctorName={result.doctorName}
            time={result.time}
            isOverflow={result.isOverflow}
            onRegisterAnother={resetToStep1}
            onDone={onClose}
          />
        )}
      </div>
    </>
  )
}
