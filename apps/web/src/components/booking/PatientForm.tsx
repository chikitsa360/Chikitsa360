'use client'

import * as React from 'react'

interface PatientFormProps {
  patientName: string
  patientPhone: string
  onNameChange: (v: string) => void
  onPhoneChange: (v: string) => void
  onPhoneBlur?: () => void
  onSubmit: (e: React.FormEvent) => void
  submitting: boolean
  phoneError: string
  nameError: string
  slotTakenError: string
}

/**
 * Validates a 10-digit Indian mobile number: starts with 6-9.
 */
export function validateIndianPhone(phone: string): string {
  if (!phone) return 'Please enter a valid 10-digit Indian mobile number.'
  if (!/^[6-9]\d{9}$/.test(phone)) return 'Please enter a valid 10-digit Indian mobile number.'
  return ''
}

export function PatientForm({
  patientName,
  patientPhone,
  onNameChange,
  onPhoneChange,
  onPhoneBlur,
  onSubmit,
  submitting,
  phoneError,
  nameError,
  slotTakenError,
}: PatientFormProps) {
  return (
    <div className="mt-4 rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="mb-4 text-[15px] font-semibold text-foreground">Your Details</h2>

      {slotTakenError && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-[13px] text-destructive"
        >
          {slotTakenError}
        </div>
      )}

      <form onSubmit={onSubmit} noValidate>
        {/* Name */}
        <div className="mb-4">
          <label
            htmlFor="patient-name"
            className="mb-1.5 block text-[13px] font-medium text-foreground"
          >
            Full Name <span className="text-destructive">*</span>
          </label>
          <input
            id="patient-name"
            type="text"
            autoComplete="name"
            value={patientName}
            onChange={(e) => onNameChange(e.target.value)}
            aria-describedby={nameError ? 'name-error' : undefined}
            aria-invalid={!!nameError}
            className={inputClass(!!nameError)}
            placeholder="e.g. Ravi Kumar"
            maxLength={100}
          />
          {nameError && (
            <p id="name-error" className="mt-1 text-[12px] text-destructive">
              {nameError}
            </p>
          )}
        </div>

        {/* Phone */}
        <div className="mb-5">
          <label
            htmlFor="patient-phone"
            className="mb-1.5 block text-[13px] font-medium text-foreground"
          >
            Mobile Number <span className="text-destructive">*</span>
          </label>
          <input
            id="patient-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={patientPhone}
            onChange={(e) => onPhoneChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
            onBlur={onPhoneBlur}
            aria-describedby={phoneError ? 'phone-error' : 'phone-hint'}
            aria-invalid={!!phoneError}
            className={inputClass(!!phoneError)}
            placeholder="10-digit number"
            maxLength={10}
          />
          {phoneError ? (
            <p id="phone-error" className="mt-1 text-[12px] text-destructive">
              {phoneError}
            </p>
          ) : (
            <p id="phone-hint" className="mt-1 text-[11px] text-muted-foreground">
              Confirmation will be sent to this number
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="flex h-[52px] w-full items-center justify-center gap-2 rounded-lg bg-primary text-[15px] font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {submitting ? (
            <>
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              Booking...
            </>
          ) : (
            'Confirm Appointment'
          )}
        </button>
      </form>
    </div>
  )
}

function inputClass(hasError: boolean) {
  return [
    'h-11 w-full rounded-lg border bg-card px-3 text-[14px] text-foreground',
    'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
    'transition-colors',
    hasError ? 'border-destructive focus:ring-destructive/30' : 'border-border',
  ].join(' ')
}
