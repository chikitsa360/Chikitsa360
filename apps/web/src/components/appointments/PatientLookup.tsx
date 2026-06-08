'use client'

import * as React from 'react'

export interface PatientRecord {
  id: string
  name: string
  phone: string
  recentVisits: { appointment_date: string; doctor_name: string; status: string }[]
}

interface PatientLookupProps {
  onPatientFound: (patient: PatientRecord | null) => void
  onPhoneChange: (phone: string) => void
  onNameChange: (name: string) => void
  phone: string
  name: string
  nameError: string
}

/**
 * Phone-number-first patient lookup (UX-DR14).
 * Auto-fills name and shows visit history for existing patients.
 * Shows "New patient" helper for new patients.
 */
export function PatientLookup({
  onPatientFound,
  onPhoneChange,
  onNameChange,
  phone,
  name,
  nameError,
}: PatientLookupProps) {
  const [looking, setLooking] = React.useState(false)
  const [existingPatient, setExistingPatient] = React.useState<PatientRecord | null>(null)
  const [showHistory, setShowHistory] = React.useState(false)
  const lookupTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  function handlePhoneChange(value: string) {
    // Allow only digits, max 10
    const digits = value.replace(/\D/g, '').slice(0, 10)
    onPhoneChange(digits)

    if (lookupTimeoutRef.current) clearTimeout(lookupTimeoutRef.current)

    if (digits.length === 10) {
      setLooking(true)
      lookupTimeoutRef.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/v1/patients/by-phone?phone=${digits}`)
          const data = (await res.json()) as { patient: PatientRecord | null }
          setExistingPatient(data.patient)
          onPatientFound(data.patient)
          if (data.patient) {
            onNameChange(data.patient.name)
          }
        } catch {
          setExistingPatient(null)
          onPatientFound(null)
        }
        setLooking(false)
      }, 300)
    } else {
      setExistingPatient(null)
      onPatientFound(null)
      if (!name) onNameChange('')
    }
  }

  function validateName(value: string): string {
    if (!value.trim()) return 'Name is required.'
    if (!/\p{L}/u.test(value.trim())) return 'Please enter a valid patient name.'
    return ''
  }

  return (
    <div className="space-y-4">
      {/* Phone input */}
      <div>
        <label className="block text-[13px] font-medium text-muted-foreground mb-1">
          Phone Number
        </label>
        <div className="relative">
          <input
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            placeholder="10-digit mobile number"
            autoFocus
            className="h-10 w-full rounded-lg border border-border bg-card px-3 text-[14px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
          {looking && (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <svg className="h-4 w-4 animate-spin text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Patient name */}
      {phone.length === 10 && !looking && (
        <div>
          <label className="block text-[13px] font-medium text-muted-foreground mb-1">
            Patient Name
          </label>
          {existingPatient ? (
            <div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={name}
                  readOnly
                  className="h-10 flex-1 rounded-lg border border-border bg-muted px-3 text-[14px] text-foreground cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => onNameChange('')}
                  aria-label="Edit name"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </div>

              {/* Visit history strip */}
              {existingPatient.recentVisits.length > 0 && (
                <div className="mt-2 rounded-md bg-muted px-3 py-2">
                  <div className="text-[11px] text-muted-foreground">
                    Last seen:{' '}
                    <span className="font-medium text-foreground">
                      {existingPatient.recentVisits[0]?.appointment_date}
                    </span>{' '}
                    — {existingPatient.recentVisits[0]?.doctor_name}
                  </div>
                  {existingPatient.recentVisits.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setShowHistory(!showHistory)}
                      className="mt-1 text-[11px] text-primary hover:underline"
                    >
                      {showHistory ? 'Hide' : `See all ${existingPatient.recentVisits.length} visits`}
                    </button>
                  )}
                  {showHistory && (
                    <div className="mt-1 space-y-0.5">
                      {existingPatient.recentVisits.slice(1).map((v, i) => (
                        <div key={i} className="text-[11px] text-muted-foreground">
                          {v.appointment_date} — {v.doctor_name} — {v.status}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div>
              <input
                type="text"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="Full name"
                className={`h-10 w-full rounded-lg border px-3 text-[14px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 ${nameError ? 'border-red-400 focus:border-red-400' : 'border-border focus:border-primary'}`}
              />
              {nameError && <p className="mt-1 text-[11px] text-red-500">{nameError}</p>}
              <p className="mt-1 text-[11px] text-muted-foreground">
                New patient — a record will be created on booking.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
