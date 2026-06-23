'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { SpecialitySelector } from '@/components/ui/SpecialitySelector'
import { LogoUpload } from '@/components/ui/LogoUpload'

interface ClinicSettingsFormProps {
  clinicName: string
  slug: string
  address: string
  city: string
  speciality: string
  clinicPhone: string
  logoUrl?: string | null
}

interface FieldError {
  name?: string
  address?: string
  city?: string
  speciality?: string
  clinicPhone?: string
}

export function ClinicSettingsForm(props: ClinicSettingsFormProps) {
  const t = useTranslations()
  const [name, setName] = React.useState(props.clinicName)
  const [address, setAddress] = React.useState(props.address)
  const [city, setCity] = React.useState(props.city)
  const [speciality, setSpeciality] = React.useState(props.speciality)
  const [clinicPhone, setClinicPhone] = React.useState(props.clinicPhone)
  const [errors, setErrors] = React.useState<FieldError>({})
  const [submitting, setSubmitting] = React.useState(false)
  const [success, setSuccess] = React.useState(false)
  const [serverError, setServerError] = React.useState('')

  // Logo state
  const [logoUrl, setLogoUrl] = React.useState<string | null>(props.logoUrl ?? null)
  const [logoUploading, setLogoUploading] = React.useState(false)
  const [logoError, setLogoError] = React.useState('')

  async function handleLogoSelect(file: File) {
    setLogoUploading(true)
    setLogoError('')
    const form = new FormData()
    form.append('logo', file)
    try {
      const res = await fetch('/api/v1/clinics/logo', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) {
        setLogoError(data.error ?? 'Upload failed')
        return
      }
      setLogoUrl(data.url)
    } catch {
      setLogoError('Upload failed. Please try again.')
    } finally {
      setLogoUploading(false)
    }
  }

  async function handleLogoRemove() {
    setLogoUploading(true)
    setLogoError('')
    try {
      await fetch('/api/v1/clinics/logo', { method: 'DELETE' })
      setLogoUrl(null)
    } catch {
      setLogoError('Failed to remove logo.')
    } finally {
      setLogoUploading(false)
    }
  }

  function validate(): FieldError {
    const e: FieldError = {}
    if (!name.trim()) e.name = t('onboarding.error.name-required')
    if (!address.trim()) e.address = t('onboarding.error.address-required')
    if (!city.trim()) e.city = t('onboarding.error.city-required')
    if (!speciality) e.speciality = t('onboarding.error.speciality-required')
    if (clinicPhone && !/^\d{10}$/.test(clinicPhone)) e.clinicPhone = t('onboarding.error.phone-invalid')
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
    setSuccess(false)
    setServerError('')

    try {
      const res = await fetch('/api/v1/clinics', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, address, city, speciality, clinicPhone }),
      })

      if (!res.ok) {
        const data = await res.json()
        setServerError(data.error ?? t('common.error.generic'))
        return
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      setServerError(t('common.error.generic'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-[640px]">
      <div className="mb-6">
        <h1 className="text-[20px] font-bold text-foreground" style={{ letterSpacing: '-0.015em' }}>
          {t('settings.clinic-profile')}
        </h1>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <form onSubmit={handleSubmit} noValidate className="px-6 py-6">
          {/* Clinic Logo */}
          <div className="mb-6">
            <label className="mb-2 block text-[13px] font-medium text-foreground">
              Clinic Logo <span className="ml-1 text-[11px] font-normal text-muted-foreground">Optional</span>
            </label>
            <LogoUpload
              currentLogoUrl={logoUrl}
              onFileSelect={handleLogoSelect}
              onRemove={handleLogoRemove}
              uploading={logoUploading}
              error={logoError}
            />
          </div>

          {/* Clinic Name */}
          <div className="mb-4">
            <label className="mb-1.5 block text-[13px] font-medium text-foreground">
              {t('onboarding.step1.name-label')} <span className="text-error">*</span>
            </label>
            <input
              type="text"
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass(!!errors.name)}
            />
            {errors.name && <p className="mt-1 text-[12px] text-error">{errors.name}</p>}
          </div>

          {/* Address */}
          <div className="mb-4">
            <label className="mb-1.5 block text-[13px] font-medium text-foreground">
              {t('onboarding.step1.address-label')} <span className="text-error">*</span>
            </label>
            <input
              type="text"
              maxLength={200}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={inputClass(!!errors.address)}
            />
            {errors.address && <p className="mt-1 text-[12px] text-error">{errors.address}</p>}
          </div>

          {/* City */}
          <div className="mb-4">
            <label className="mb-1.5 block text-[13px] font-medium text-foreground">
              {t('onboarding.step1.city-label')} <span className="text-error">*</span>
            </label>
            <input
              type="text"
              maxLength={50}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={inputClass(!!errors.city)}
            />
            {errors.city && <p className="mt-1 text-[12px] text-error">{errors.city}</p>}
          </div>

          {/* Speciality */}
          <div className="mb-4">
            <label className="mb-1.5 block text-[13px] font-medium text-foreground">
              {t('onboarding.step1.speciality-label')} <span className="text-error">*</span>
            </label>
            <SpecialitySelector
              value={speciality}
              onChange={setSpeciality}
              hasError={!!errors.speciality}
            />
            {errors.speciality && <p className="mt-1 text-[12px] text-error">{errors.speciality}</p>}
          </div>

          {/* Phone */}
          <div className="mb-4">
            <label className="mb-1.5 block text-[13px] font-medium text-foreground">
              {t('onboarding.step1.phone-label')}
            </label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={clinicPhone}
              onChange={(e) => setClinicPhone(e.target.value.replace(/\D/g, ''))}
              className={inputClass(!!errors.clinicPhone)}
            />
            {errors.clinicPhone && <p className="mt-1 text-[12px] text-error">{errors.clinicPhone}</p>}
          </div>

          {/* Slug (read-only) */}
          <div className="mb-6">
            <label className="mb-1.5 block text-[13px] font-medium text-foreground">
              {t('onboarding.step1.slug-label')}
            </label>
            <div className="flex h-11 items-center rounded-lg border border-border bg-muted px-3 text-[13px] text-muted-foreground">
              {props.slug}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {t('settings.clinic-slug-locked')}
            </p>
          </div>

          {serverError && (
            <p className="mb-4 rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-[13px] text-error">
              {serverError}
            </p>
          )}

          {success && (
            <p className="mb-4 rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-[13px] text-success">
              {t('settings.save-success')}
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="flex h-10 items-center rounded-lg bg-primary px-5 text-[13px] font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? t('onboarding.common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function inputClass(hasError: boolean) {
  return [
    'h-11 w-full rounded-lg border bg-card px-3 text-[13px] text-foreground',
    'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
    'transition-colors',
    hasError ? 'border-error focus:ring-error/30 focus:border-error' : 'border-border',
  ].join(' ')
}
