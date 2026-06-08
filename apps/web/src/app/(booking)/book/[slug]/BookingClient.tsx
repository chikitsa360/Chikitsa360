'use client'

import * as React from 'react'
import { DoctorSelector } from '@/components/booking/DoctorSelector'
import { SlotGrid, type Slot } from '@/components/booking/SlotGrid'
import { PatientForm, validateIndianPhone } from '@/components/booking/PatientForm'
import { BookingSuccess } from '@/components/booking/BookingSuccess'

interface Doctor {
  id: string
  name: string
}

interface ClinicInfo {
  id: string
  name: string
  slug: string
  speciality: string | null
  address: string | null
  city: string | null
  clinicPhone: string | null
  isPlanExpired: boolean
  whatsappConnected: boolean
}

interface BookingClientProps {
  clinic: ClinicInfo
  doctors: Doctor[]
}

interface BookingResult {
  appointmentId: string
  tokenNumber: number
  doctorId: string
  doctorName: string
  date: string
  startTime: string
}

export function BookingClient({ clinic, doctors }: BookingClientProps) {
  const [selectedDoctorId, setSelectedDoctorId] = React.useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = React.useState<Slot | null>(null)
  const [slots, setSlots] = React.useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = React.useState(false)

  // Patient form state
  const [patientName, setPatientName] = React.useState('')
  const [patientPhone, setPatientPhone] = React.useState('')
  const [nameError, setNameError] = React.useState('')
  const [phoneError, setPhoneError] = React.useState('')
  const [slotTakenError, setSlotTakenError] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  // Success state
  const [bookingResult, setBookingResult] = React.useState<BookingResult | null>(null)

  // Fetch slots whenever doctor filter changes
  React.useEffect(() => {
    let cancelled = false
    setLoadingSlots(true)
    setSelectedSlot(null)

    const params = new URLSearchParams({ slug: clinic.slug, days: '7' })
    if (selectedDoctorId) params.set('doctorId', selectedDoctorId)

    fetch(`/api/v1/slots/available?${params}`)
      .then((r) => r.json())
      .then((data: { slots?: Slot[] }) => {
        if (!cancelled) setSlots(data.slots ?? [])
      })
      .catch(() => {
        if (!cancelled) setSlots([])
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false)
      })

    return () => { cancelled = true }
  }, [clinic.slug, selectedDoctorId])

  function handleSlotSelect(slot: Slot) {
    setSelectedSlot(slot)
    setSlotTakenError('')
  }

  function handlePhoneBlur() {
    if (patientPhone) setPhoneError(validateIndianPhone(patientPhone))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Validate
    const pNameErr = patientName.trim() ? '' : 'Name is required.'
    const pPhoneErr = validateIndianPhone(patientPhone)
    setNameError(pNameErr)
    setPhoneError(pPhoneErr)
    if (pNameErr || pPhoneErr || !selectedSlot) return

    setSubmitting(true)
    setSlotTakenError('')

    try {
      const res = await fetch('/api/v1/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicSlug: clinic.slug,
          doctorId: selectedSlot.doctorId,
          date: selectedSlot.date,
          startTime: selectedSlot.startTime,
          patientName: patientName.trim(),
          patientPhone,
        }),
      })

      if (res.status === 409) {
        // Slot taken — refresh slots
        setSlotTakenError('Sorry, that slot was just taken. Please choose another time.')
        setSelectedSlot(null)
        const params = new URLSearchParams({ slug: clinic.slug, days: '7' })
        if (selectedDoctorId) params.set('doctorId', selectedDoctorId)
        const refreshed = await fetch(`/api/v1/slots/available?${params}`)
        const data = (await refreshed.json()) as { slots?: Slot[] }
        setSlots(data.slots ?? [])
        return
      }

      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        setSlotTakenError(data.error ?? 'Something went wrong. Please try again.')
        return
      }

      const result = (await res.json()) as BookingResult
      setBookingResult(result)
    } catch {
      setSlotTakenError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleBookAnother() {
    setBookingResult(null)
    setSelectedSlot(null)
    setPatientName('')
    setPatientPhone('')
    setNameError('')
    setPhoneError('')
    setSlotTakenError('')
  }

  // Expired plan
  if (clinic.isPlanExpired) {
    return (
      <div className="rounded-xl border border-border bg-card px-5 py-8 text-center shadow-sm">
        <p className="text-[14px] text-foreground">
          Online booking is temporarily unavailable. Please contact the clinic directly
          {clinic.clinicPhone ? ` at ${clinic.clinicPhone}` : ''}.
        </p>
      </div>
    )
  }

  // Success screen
  if (bookingResult) {
    return (
      <BookingSuccess
        tokenNumber={bookingResult.tokenNumber}
        doctorName={bookingResult.doctorName}
        date={bookingResult.date}
        startTime={bookingResult.startTime}
        clinicName={clinic.name}
        clinicAddress={[clinic.address, clinic.city].filter(Boolean).join(', ')}
        patientPhone={patientPhone}
        whatsappPhone={undefined}
        onBookAnother={handleBookAnother}
      />
    )
  }

  return (
    <div>
      {/* Doctor selector */}
      <DoctorSelector
        doctors={doctors}
        selectedDoctorId={selectedDoctorId}
        onSelect={setSelectedDoctorId}
      />

      {/* Slot grid */}
      {loadingSlots ? (
        <div className="flex justify-center py-10">
          <svg className="h-6 w-6 animate-spin text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        </div>
      ) : slots.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-5 py-8 text-center shadow-sm">
          <p className="text-[14px] text-muted-foreground">
            No appointments available in the next 7 days.
            {clinic.clinicPhone && (
              <> Please call us at <a href={`tel:${clinic.clinicPhone}`} className="font-semibold text-primary">{clinic.clinicPhone}</a>.</>
            )}
          </p>
        </div>
      ) : (
        <SlotGrid
          slots={slots}
          selectedSlot={selectedSlot}
          onSelect={handleSlotSelect}
        />
      )}

      {/* Patient form — shown when slot is selected */}
      {selectedSlot && (
        <PatientForm
          patientName={patientName}
          patientPhone={patientPhone}
          onNameChange={setPatientName}
          onPhoneChange={(v) => { setPatientPhone(v); if (phoneError) setPhoneError(validateIndianPhone(v)) }}
          onSubmit={handleSubmit}
          submitting={submitting}
          phoneError={phoneError}
          nameError={nameError}
          slotTakenError={slotTakenError}
          onPhoneBlur={handlePhoneBlur}
        />
      )}
    </div>
  )
}
