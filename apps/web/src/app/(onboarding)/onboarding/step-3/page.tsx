'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { OnboardingShell } from '@/components/onboarding/OnboardingShell'
import { WorkingHoursForm, type WorkingHoursData } from '@/components/onboarding/WorkingHoursForm'

interface Doctor {
  id: string
  name: string
}

export default function Step3Page() {
  const t = useTranslations('onboarding')
  const router = useRouter()

  const [doctors, setDoctors] = React.useState<Doctor[]>([])
  const [activeTab, setActiveTab] = React.useState(0)
  const [workingHoursMap, setWorkingHoursMap] = React.useState<Record<string, WorkingHoursData>>({})
  const [timeErrors, setTimeErrors] = React.useState<Record<string, string>>({})
  const [submitting, setSubmitting] = React.useState(false)
  const [serverError, setServerError] = React.useState('')
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    fetch('/api/v1/doctors')
      .then((r) => r.json())
      .then((data: Doctor[]) => {
        if (Array.isArray(data)) setDoctors(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleWorkingHoursChange = React.useCallback(
    (data: WorkingHoursData) => {
      setWorkingHoursMap((prev) => ({ ...prev, [data.doctorId]: data }))
    },
    []
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Validate all time ranges
    const errors: Record<string, string> = {}
    for (const [, data] of Object.entries(workingHoursMap)) {
      const sp = data.startTime.split(':').map(Number)
      const ep = data.endTime.split(':').map(Number)
      const sh = sp[0] ?? 0, sm = sp[1] ?? 0
      const eh = ep[0] ?? 0, em = ep[1] ?? 0
      if (eh * 60 + em <= sh * 60 + sm) {
        errors[data.doctorId] = 'End time must be after start time.'
      }
    }
    if (Object.keys(errors).length > 0) {
      setTimeErrors(errors)
      return
    }
    setTimeErrors({})
    setSubmitting(true)
    setServerError('')

    try {
      // Build working_hours records: one per active day per doctor
      const payload: {
        doctorId: string
        dayOfWeek: number
        startTime: string
        endTime: string
        slotDuration: number
        lunchStartTime: string | null
        lunchEndTime: string | null
        isActive: boolean
      }[] = []

      for (const data of Object.values(workingHoursMap)) {
        for (const day of data.activeDays) {
          payload.push({
            doctorId: data.doctorId,
            dayOfWeek: day,
            startTime: data.startTime,
            endTime: data.endTime,
            slotDuration: data.slotDuration,
            lunchStartTime: data.lunchEnabled ? data.lunchStartTime : null,
            lunchEndTime: data.lunchEnabled ? data.lunchEndTime : null,
            isActive: true,
          })
        }
      }

      const res = await fetch('/api/v1/working-hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        setServerError(data.error ?? t('error.generic'))
        return
      }

      router.push('/onboarding/step-4')
    } catch {
      setServerError(t('error.generic'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <OnboardingShell currentStep={3} title={t('step3.title')} subtitle={t('step3.subtitle')}
        onBack={() => router.push('/onboarding/step-2')}
        hideContinue
      >
        <div className="py-8 text-center text-[13px] text-muted-foreground">Loading...</div>
      </OnboardingShell>
    )
  }

  const currentDoctor = doctors[activeTab]

  return (
    <OnboardingShell
      currentStep={3}
      title={t('step3.title')}
      subtitle={t('step3.subtitle')}
      formId="working-hours-form"
      onBack={() => router.push('/onboarding/step-2')}
      onContinueDisabled={!currentDoctor}
      onContinueLoading={submitting}
    >
      <form id="working-hours-form" onSubmit={handleSubmit} noValidate>
        {/* Doctor tabs (only if multiple doctors) */}
        {doctors.length > 1 && (
          <div className="mb-6 flex gap-1 overflow-x-auto rounded-lg border border-border bg-muted p-1">
            {doctors.map((doc, idx) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => setActiveTab(idx)}
                className="flex-shrink-0 rounded-md px-4 py-2 text-[13px] font-medium transition-colors"
                style={
                  idx === activeTab
                    ? { background: 'var(--color-card)', color: 'var(--color-foreground)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
                    : { color: 'var(--color-muted-foreground)' }
                }
              >
                {doc.name}
              </button>
            ))}
          </div>
        )}

        {currentDoctor ? (
          <WorkingHoursForm
            key={currentDoctor.id}
            doctorId={currentDoctor.id}
            onChange={handleWorkingHoursChange}
            error={timeErrors[currentDoctor.id]}
          />
        ) : (
          <div className="py-8 text-center text-[13px] text-muted-foreground">
            No doctors found. Please go back and add a doctor.
          </div>
        )}

        {serverError && (
          <p className="mt-4 rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-[13px] text-error">
            {serverError}
          </p>
        )}

      </form>
    </OnboardingShell>
  )
}
