'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { OnboardingShell } from './OnboardingShell'
import { BookingLinkShare } from './BookingLinkShare'

interface WizardCompleteProps {
  clinicName?: string
  slug?: string
}

export function WizardComplete({ clinicName, slug: initialSlug }: WizardCompleteProps) {
  const t = useTranslations('onboarding')
  const router = useRouter()
  const { update: updateSession } = useSession()
  const [slug, setSlug] = React.useState(initialSlug ?? '')
  const [loading, setLoading] = React.useState(!initialSlug)
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (initialSlug) return
    // Complete onboarding and get slug
    fetch('/api/v1/clinics/complete-onboarding', { method: 'POST' })
      .then((r) => r.json())
      .then((data) => {
        if (data.slug) setSlug(data.slug)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [initialSlug])

  async function handleGoToDashboard() {
    setSubmitting(true)
    if (initialSlug) {
      // Slug was pre-loaded from RSC — still need to mark onboarding complete in DB
      await fetch('/api/v1/clinics/complete-onboarding', { method: 'POST' }).catch(() => {})
    }
    await updateSession()
    router.push('/dashboard')
  }

  if (loading) {
    return (
      <OnboardingShell currentStep={5} title="Setting up your clinic..." subtitle="" hideContinue>
        <div className="py-12 text-center text-[13px] text-muted-foreground">
          Creating your workspace...
        </div>
      </OnboardingShell>
    )
  }

  return (
    <OnboardingShell
      currentStep={5}
      title={t('complete.title')}
      subtitle=""
      onContinueLabel={t('complete.go-to-dashboard')}
      onContinueClick={handleGoToDashboard}
      onContinueLoading={submitting}
    >
      <div className="text-center">
        {/* Success illustration */}
        <div
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ background: 'rgba(16,185,129,0.1)' }}
        >
          <svg className="h-8 w-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        </div>

        <h2
          className="mb-2 font-bold text-foreground"
          style={{ fontSize: 22, letterSpacing: '-0.015em', fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}
        >
          {clinicName ? `${clinicName} is ready!` : t('complete.title')}
        </h2>
        <p className="mb-6 text-[14px] text-muted-foreground">
          {t('complete.subtitle')}
        </p>

        {/* Booking link */}
        {slug && <BookingLinkShare slug={slug} />}
      </div>
    </OnboardingShell>
  )
}
