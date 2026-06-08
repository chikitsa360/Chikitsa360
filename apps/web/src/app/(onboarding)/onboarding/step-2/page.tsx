'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { OnboardingShell } from '@/components/onboarding/OnboardingShell'
import { DoctorFormRow, type DoctorRowData } from '@/components/onboarding/DoctorForm'

const PLAN_LIMITS: Record<string, number> = {
  STARTER: 1,
  GROWTH: 3,
  PRO: 10,
}

function emptyDoctor(): DoctorRowData {
  return { name: '', phone: '', speciality: '', defaultFee: '' }
}

export default function Step2Page() {
  const t = useTranslations('onboarding')
  const router = useRouter()

  const [plan, setPlan] = React.useState<string>('STARTER')
  const [doctors, setDoctors] = React.useState<DoctorRowData[]>([emptyDoctor()])
  const [errors, setErrors] = React.useState<{ name?: string; phone?: string }[]>([{}])
  const [planLimitError, setPlanLimitError] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [serverError, setServerError] = React.useState('')

  // Load plan from clinic endpoint
  React.useEffect(() => {
    fetch('/api/v1/clinics')
      .then((r) => r.json())
      .then((data) => {
        if (data?.plan) setPlan(data.plan)
      })
      .catch(() => {})
  }, [])

  function updateDoctor(index: number, data: DoctorRowData) {
    setDoctors((prev) => prev.map((d, i) => (i === index ? data : d)))
  }

  function removeDoctor(index: number) {
    setDoctors((prev) => prev.filter((_, i) => i !== index))
    setErrors((prev) => prev.filter((_, i) => i !== index))
  }

  function addDoctor() {
    const limit = PLAN_LIMITS[plan] ?? 1
    if (doctors.length >= limit) {
      setPlanLimitError(
        `${plan} plan supports ${limit} Doctor${limit > 1 ? 's' : ''}. Upgrade to add more.`
      )
      return
    }
    setPlanLimitError('')
    setDoctors((prev) => [...prev, emptyDoctor()])
    setErrors((prev) => [...prev, {}])
  }

  function validate() {
    const errs = doctors.map((d) => {
      const e: { name?: string; phone?: string } = {}
      if (!d.name.trim()) e.name = t('error.doctor-name-required')
      if (!d.phone || !/^\d{10}$/.test(d.phone)) e.phone = 'Enter a valid 10-digit mobile number'
      return e
    })
    setErrors(errs)
    return errs.every((e) => Object.keys(e).length === 0)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    setServerError('')

    try {
      const payload = doctors.map((d) => ({
        name: d.name,
        phone: d.phone,
        speciality: d.speciality || undefined,
        defaultFee: d.defaultFee ? Number(d.defaultFee) : null,
      }))

      const res = await fetch('/api/v1/doctors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        setServerError(data.error ?? t('error.generic'))
        return
      }

      router.push('/onboarding/step-3')
    } catch {
      setServerError(t('error.generic'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <OnboardingShell
      currentStep={2}
      title={t('step2.title')}
      subtitle={t('step2.subtitle')}
      formId="doctor-form"
      onBack={() => router.push('/onboarding/step-1')}
      onContinueLoading={submitting}
    >
      <form id="doctor-form" onSubmit={handleSubmit} noValidate>
        {doctors.map((doc, idx) => (
          <DoctorFormRow
            key={idx}
            index={idx}
            data={doc}
            onChange={updateDoctor}
            onRemove={doctors.length > 1 ? removeDoctor : undefined}
            errors={errors[idx]}
          />
        ))}

        {/* Plan limit exceeded */}
        {planLimitError && (
          <div
            className="mb-4 rounded-xl border border-warning/30 px-4 py-3 text-[13px]"
            style={{ background: 'rgba(245,158,11,0.06)', color: '#D97706' }}
          >
            {planLimitError}
            {' '}
            <a href="/settings/billing" className="font-semibold underline">
              Upgrade Plan
            </a>
          </div>
        )}

        {/* Add another doctor button */}
        <button
          type="button"
          onClick={addDoctor}
          className="mb-6 flex h-11 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-[13px] font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {t('step2.add-another')}
        </button>

        {serverError && (
          <p className="mb-4 rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-[13px] text-error">
            {serverError}
          </p>
        )}

      </form>
    </OnboardingShell>
  )
}
