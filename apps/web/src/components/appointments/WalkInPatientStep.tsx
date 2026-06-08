'use client'

import * as React from 'react'
import { PatientLookup, type PatientRecord } from './PatientLookup'

interface WalkInPatientStepProps {
  phone: string
  name: string
  existingPatient: PatientRecord | null
  onPhoneChange: (v: string) => void
  onNameChange: (v: string) => void
  onPatientFound: (p: PatientRecord | null) => void
  onNext: () => void
}

export function WalkInPatientStep({
  phone,
  name,
  existingPatient,
  onPhoneChange,
  onNameChange,
  onPatientFound,
  onNext,
}: WalkInPatientStepProps) {
  const [nameError, setNameError] = React.useState('')

  function validateAndNext() {
    if (!existingPatient) {
      if (!name.trim()) { setNameError('Name is required.'); return }
      if (/^[\d\W]+$/.test(name.trim())) { setNameError('Please enter a valid patient name.'); return }
    }
    onNext()
  }

  const canProceed = phone.length === 10 && (!!existingPatient || name.trim().length > 0)

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <PatientLookup
          phone={phone}
          name={name}
          nameError={nameError}
          onPhoneChange={(v) => { onPhoneChange(v); setNameError('') }}
          onNameChange={(v) => { onNameChange(v); if (nameError) setNameError('') }}
          onPatientFound={onPatientFound}
        />
      </div>
      <div className="border-t border-border px-4 py-3">
        <button
          type="button"
          onClick={validateAndNext}
          disabled={!canProceed}
          className="w-full h-[52px] rounded-lg bg-primary text-[14px] font-semibold text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          Next →
        </button>
      </div>
    </div>
  )
}
