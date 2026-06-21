'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { OnboardingShell } from './OnboardingShell'
import { generateSlug } from '@/lib/slug'

const SPECIALITIES = [
  'General Medicine',
  'Dermatology',
  'Dentistry',
  'Orthopaedics',
  'Gynaecology',
  'Paediatrics',
  'Ophthalmology',
  'ENT',
  'Other',
]

interface Prefill {
  name?: string
  address?: string
  city?: string
  speciality?: string
  clinicPhone?: string
  slug?: string
  slugLocked?: boolean
}

interface ClinicProfileFormProps {
  prefill?: Prefill
}

interface FieldError {
  name?: string
  address?: string
  city?: string
  speciality?: string
  clinicPhone?: string
  slug?: string
  legal?: string
}

export function ClinicProfileForm({ prefill = {} }: ClinicProfileFormProps) {
  const t = useTranslations('onboarding')
  const router = useRouter()
  const [name, setName] = React.useState(prefill.name ?? '')
  const [address, setAddress] = React.useState(prefill.address ?? '')
  const [city, setCity] = React.useState(prefill.city ?? '')
  const [speciality, setSpeciality] = React.useState(prefill.speciality ?? '')
  const [clinicPhone, setClinicPhone] = React.useState(prefill.clinicPhone ?? '')
  const [slug, setSlug] = React.useState(prefill.slug ?? '')
  const [slugManuallyEdited, setSlugManuallyEdited] = React.useState(false)
  const [slugLocked] = React.useState(prefill.slugLocked ?? false)
  const [slugAvailable, setSlugAvailable] = React.useState<boolean | null>(null)
  const [slugSuggestion, setSlugSuggestion] = React.useState('')

  const [tosAccepted, setTosAccepted] = React.useState(false)
  const [privacyAccepted, setPrivacyAccepted] = React.useState(false)
  const [dpaAccepted, setDpaAccepted] = React.useState(false)

  const [errors, setErrors] = React.useState<FieldError>({})
  const [submitting, setSubmitting] = React.useState(false)
  const [serverError, setServerError] = React.useState('')

  // Auto-generate slug from name if not manually edited
  React.useEffect(() => {
    if (!slugManuallyEdited && !slugLocked) {
      setSlug(generateSlug(name))
    }
  }, [name, slugManuallyEdited, slugLocked])

  // Debounced slug availability check
  React.useEffect(() => {
    if (!slug || slugLocked) return
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/clinics/slug/check?slug=${encodeURIComponent(slug)}`)
        const data = await res.json()
        setSlugAvailable(data.available)
        setSlugSuggestion(data.suggestion ?? '')
      } catch {
        setSlugAvailable(null)
      }
    }, 400)
    return () => clearTimeout(t)
  }, [slug, slugLocked])

  const allLegalAccepted = tosAccepted && privacyAccepted && dpaAccepted

  function validate(): FieldError {
    const e: FieldError = {}
    if (!name.trim()) e.name = t('error.name-required')
    if (!address.trim()) e.address = t('error.address-required')
    if (!city.trim()) e.city = t('error.city-required')
    if (!speciality) e.speciality = t('error.speciality-required')
    if (clinicPhone && !/^\d{10}$/.test(clinicPhone)) e.clinicPhone = t('error.phone-invalid')
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) e.slug = t('error.slug-invalid')
    if (!allLegalAccepted) e.legal = t('error.legal-required')
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})
    setSubmitting(true)
    setServerError('')

    try {
      const res = await fetch('/api/v1/clinics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          address,
          city,
          speciality,
          clinicPhone,
          slug,
          tosAccepted,
          privacyAccepted,
          dpaAccepted,
        }),
      })

      if (res.status === 409) {
        const data = await res.json()
        setErrors({ slug: data.error })
        setSlugSuggestion(data.suggestion ?? '')
        return
      }

      if (!res.ok) {
        const data = await res.json()
        setServerError(data.error ?? t('error.generic'))
        return
      }

      // Force NextAuth to re-issue the JWT so clinicId is available in step-2
      await fetch('/api/auth/session', { method: 'POST' })
      router.push('/onboarding/step-2')
    } catch {
      setServerError(t('error.generic'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <OnboardingShell
      currentStep={1}
      title={t('step1.title')}
      subtitle={t('step1.subtitle')}
      formId="clinic-profile-form"
      onContinueDisabled={!allLegalAccepted}
      onContinueLoading={submitting}
    >
      <form id="clinic-profile-form" onSubmit={handleSubmit} noValidate>
        {/* Clinic Name */}
        <div className="mb-4">
          <label className="mb-1.5 block text-[13px] font-medium text-foreground">
            {t('step1.name-label')} <span className="text-error">*</span>
          </label>
          <input
            type="text"
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('step1.name-placeholder')}
            className={inputClass(!!errors.name)}
          />
          {errors.name && <p className="mt-1 text-[12px] text-error">{errors.name}</p>}
        </div>

        {/* Address */}
        <div className="mb-4">
          <label className="mb-1.5 block text-[13px] font-medium text-foreground">
            {t('step1.address-label')} <span className="text-error">*</span>
          </label>
          <input
            type="text"
            maxLength={200}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={t('step1.address-placeholder')}
            className={inputClass(!!errors.address)}
          />
          {errors.address && <p className="mt-1 text-[12px] text-error">{errors.address}</p>}
        </div>

        {/* City */}
        <div className="mb-4">
          <label className="mb-1.5 block text-[13px] font-medium text-foreground">
            {t('step1.city-label')} <span className="text-error">*</span>
          </label>
          <input
            type="text"
            maxLength={50}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder={t('step1.city-placeholder')}
            className={inputClass(!!errors.city)}
          />
          {errors.city && <p className="mt-1 text-[12px] text-error">{errors.city}</p>}
        </div>

        {/* Speciality */}
        <div className="mb-4">
          <label className="mb-1.5 block text-[13px] font-medium text-foreground">
            {t('step1.speciality-label')} <span className="text-error">*</span>
          </label>
          <select
            value={speciality}
            onChange={(e) => setSpeciality(e.target.value)}
            className={inputClass(!!errors.speciality)}
          >
            <option value="">{t('step1.speciality-placeholder')}</option>
            {SPECIALITIES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {errors.speciality && <p className="mt-1 text-[12px] text-error">{errors.speciality}</p>}
        </div>

        {/* Clinic Phone (optional) */}
        <div className="mb-4">
          <label className="mb-1.5 block text-[13px] font-medium text-foreground">
            {t('step1.phone-label')}
          </label>
          <input
            type="tel"
            inputMode="numeric"
            maxLength={10}
            value={clinicPhone}
            onChange={(e) => setClinicPhone(e.target.value.replace(/\D/g, ''))}
            placeholder={t('step1.phone-placeholder')}
            className={inputClass(!!errors.clinicPhone)}
          />
          {errors.clinicPhone && <p className="mt-1 text-[12px] text-error">{errors.clinicPhone}</p>}
        </div>

        {/* Booking URL Slug */}
        <div className="mb-6">
          <label className="mb-1.5 block text-[13px] font-medium text-foreground">
            {t('step1.slug-label')} <span className="text-error">*</span>
          </label>
          {slugLocked ? (
            <div>
              <div
                className="flex h-[38px] items-center rounded-lg border border-border bg-muted px-3 text-[13px] text-muted-foreground"
                style={{ cursor: 'not-allowed' }}
              >
                {slug}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{t('step1.slug-locked')}</p>
            </div>
          ) : (
            <div>
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  const v = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                  setSlug(v)
                  setSlugManuallyEdited(true)
                }}
                placeholder="abc-dental-clinic"
                className={inputClass(!!errors.slug)}
              />
              {slug && !errors.slug && (
                <div className="mt-1 flex items-center gap-1.5">
                  {slugAvailable === true && (
                    <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  )}
                  {slugAvailable === false && (
                    <span className="h-1.5 w-1.5 rounded-full bg-error" />
                  )}
                  <p
                    className="text-[11px]"
                    style={{ color: slugAvailable === false ? 'var(--color-error)' : '#64748B' }}
                  >
                    cliniqly.com/book/{slug}
                  </p>
                </div>
              )}
              {errors.slug && (
                <p className="mt-1 text-[12px] text-error">
                  {errors.slug}
                  {slugSuggestion && (
                    <button
                      type="button"
                      className="ml-1.5 underline"
                      onClick={() => { setSlug(slugSuggestion); setSlugManuallyEdited(true) }}
                    >
                      {t('step1.slug-use-suggestion', { suggestion: slugSuggestion })}
                    </button>
                  )}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Legal section */}
        <div
          className="mb-6 rounded-xl border border-border p-5"
          style={{ background: 'var(--color-muted, #F8FAFC)' }}
        >
          <p className="mb-4 text-[13px] text-muted-foreground">
            {t('step1.legal-intro')}
          </p>

          {[
            {
              key: 'tos',
              checked: tosAccepted,
              set: setTosAccepted,
              label: t('step1.legal-tos'),
            },
            {
              key: 'privacy',
              checked: privacyAccepted,
              set: setPrivacyAccepted,
              label: t('step1.legal-privacy'),
            },
            {
              key: 'dpa',
              checked: dpaAccepted,
              set: setDpaAccepted,
              label: t('step1.legal-dpa'),
            },
          ].map(({ key, checked, set, label }) => (
            <label key={key} className="mb-3 flex cursor-pointer items-start gap-3 last:mb-0">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => set(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
              />
              <span
                className="text-[13px] text-foreground [&_a]:font-medium [&_a]:text-primary [&_a]:hover:underline"
                dangerouslySetInnerHTML={{ __html: label }}
              />
            </label>
          ))}

          {errors.legal && (
            <p className="mt-3 text-[12px] text-error">{errors.legal}</p>
          )}
        </div>

        {/* Server error */}
        {serverError && (
          <p className="mb-4 rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-[13px] text-error">
            {serverError}
          </p>
        )}

      </form>
    </OnboardingShell>
  )
}

function inputClass(hasError: boolean) {
  return [
    'h-[38px] w-full rounded-lg border bg-white px-3 text-[13px] text-foreground',
    'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
    'transition-colors',
    hasError ? 'border-error focus:ring-error/30 focus:border-error' : 'border-border',
  ].join(' ')
}
