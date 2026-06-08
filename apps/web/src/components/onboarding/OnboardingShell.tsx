'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

const STEPS = [
  { n: 1, label: 'Clinic Details' },
  { n: 2, label: 'Add Doctor' },
  { n: 3, label: 'Working Hours' },
  { n: 4, label: 'WhatsApp' },
]

interface OnboardingShellProps {
  currentStep: number
  stepLabel?: string       // e.g. "Step 1 of 4"
  title: string
  subtitle?: string
  /** Content inside the card body */
  children: React.ReactNode
  /** Footer: Back button href (optional) + primary button config */
  onBack?: () => void
  onBackHref?: string      // alternative to onBack: renders an <a> link
  onContinueLabel?: string
  onContinueDisabled?: boolean
  onContinueLoading?: boolean
  onContinueClick?: (e: React.FormEvent) => void
  formId?: string          // if set, continue button submits the form with this id
  hideContinue?: boolean   // hides the Continue button (e.g. step 4 with its own CTAs)
}

export function OnboardingShell({
  currentStep,
  title,
  subtitle,
  children,
  onBack,
  onBackHref,
  onContinueLabel = 'Save & Continue',
  onContinueDisabled = false,
  onContinueLoading = false,
  onContinueClick,
  formId,
  hideContinue = false,
}: OnboardingShellProps) {
  const router = useRouter()

  return (
    <div className="flex min-h-screen flex-col" style={{ background: '#F8FAFC' }}>

      {/* ── Top nav ─────────────────────────────────────────────────────── */}
      <div
        className="flex h-14 shrink-0 items-center px-8"
        style={{ background: '#fff', borderBottom: '1px solid #E2E8F0' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] text-[14px] font-bold text-white"
            style={{ background: '#0A6EFF', fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}
          >
            C
          </div>
          <span
            className="text-[16px] font-bold text-foreground"
            style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}
          >
            Cliniqly
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2 text-[13px]" style={{ color: '#94A3B8' }}>
          <span>Need help?</span>
          <a href="/support" style={{ color: '#0A6EFF', fontWeight: 600, textDecoration: 'none' }}>
            Chat with us
          </a>
        </div>
      </div>

      {/* ── Progress stepper ────────────────────────────────────────────── */}
      <div
        className="shrink-0 px-8 py-4"
        style={{ background: '#fff', borderBottom: '1px solid #E2E8F0' }}
      >
        <div className="mx-auto flex max-w-[700px] items-center">
          {STEPS.map((step, idx) => {
            const isComplete = step.n < currentStep
            const isActive = step.n === currentStep
            return (
              <React.Fragment key={step.n}>
                <div className="flex flex-col items-center">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-full border-2 text-[12px] font-bold transition-colors"
                    style={
                      isComplete
                        ? { background: '#10B981', borderColor: '#10B981', color: '#fff' }
                        : isActive
                        ? { background: '#fff', borderColor: '#0A6EFF', color: '#0A6EFF' }
                        : { background: '#fff', borderColor: '#E2E8F0', color: '#94A3B8' }
                    }
                  >
                    {isComplete ? (
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      step.n
                    )}
                  </div>
                  <span
                    className="mt-1.5 text-[11.5px] font-semibold whitespace-nowrap"
                    style={{
                      color: isActive ? '#0A6EFF' : isComplete ? '#475569' : '#94A3B8',
                    }}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className="mx-1 mb-4 h-[2px] flex-1 transition-colors"
                    style={{ background: isComplete ? '#0A6EFF' : '#E2E8F0' }}
                  />
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <div className="flex flex-1 items-start justify-center px-6 py-10">
        <div
          className="w-full overflow-hidden"
          style={{
            maxWidth: 680,
            background: '#fff',
            border: '1px solid #E2E8F0',
            borderRadius: 16,
          }}
        >
          {/* Card hero (gradient) */}
          <div
            style={{
              background: 'linear-gradient(135deg, #0A6EFF 0%, #1E40AF 100%)',
              padding: '28px 32px',
              color: '#fff',
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                opacity: 0.7,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 6,
              }}
            >
              {currentStep <= 4 ? `Step ${currentStep} of 4` : 'Setup Complete'}
            </div>
            <div
              style={{
                fontFamily: 'Plus Jakarta Sans, Inter, sans-serif',
                fontSize: 22,
                fontWeight: 700,
                marginBottom: 6,
              }}
            >
              {title}
            </div>
            {subtitle && (
              <div style={{ fontSize: 13.5, opacity: 0.8, lineHeight: 1.55 }}>{subtitle}</div>
            )}
          </div>

          {/* Card body */}
          <div style={{ padding: '28px 32px' }}>{children}</div>

          {/* Card footer */}
          <div
            style={{
              padding: '20px 32px',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: '#fff',
            }}
          >
            {/* Progress dots */}
            <div style={{ display: 'flex', gap: 6, flex: 1 }}>
              {STEPS.map((step) => (
                <div
                  key={step.n}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background:
                      step.n === currentStep
                        ? '#0A6EFF'
                        : step.n < currentStep
                        ? 'rgba(10,110,255,0.4)'
                        : '#E2E8F0',
                  }}
                />
              ))}
            </div>

            {/* Back button */}
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                style={{
                  height: 40,
                  padding: '0 20px',
                  borderRadius: 8,
                  border: '1px solid #E2E8F0',
                  background: 'transparent',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                Back
              </button>
            ) : onBackHref ? (
              <a
                href={onBackHref}
                style={{
                  height: 40,
                  padding: '0 20px',
                  borderRadius: 8,
                  border: '1px solid #E2E8F0',
                  background: 'transparent',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  textDecoration: 'none',
                }}
              >
                Back
              </a>
            ) : (
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                style={{
                  height: 40,
                  padding: '0 20px',
                  borderRadius: 8,
                  border: '1px solid #E2E8F0',
                  background: 'transparent',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                I&apos;ll finish later
              </button>
            )}

            {/* Continue button */}
            {!hideContinue && <button
              type={formId ? 'submit' : 'button'}
              form={formId}
              onClick={!formId ? onContinueClick : undefined}
              disabled={onContinueDisabled || onContinueLoading}
              style={{
                height: 40,
                padding: '0 24px',
                borderRadius: 8,
                border: 'none',
                background: onContinueDisabled ? '#94A3B8' : '#0A6EFF',
                fontSize: 14,
                fontWeight: 600,
                color: '#fff',
                cursor: onContinueDisabled ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                opacity: onContinueLoading ? 0.7 : 1,
              }}
            >
              {onContinueLoading ? 'Saving...' : onContinueLabel}
              {!onContinueLoading && (
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              )}
            </button>}
          </div>
        </div>
      </div>

      {/* Next step hint */}
      <div className="py-3 text-center text-[12.5px]" style={{ color: '#94A3B8' }}>
        {currentStep < 4 ? (
          <>
            Next:{' '}
            <strong style={{ color: '#475569' }}>{STEPS[currentStep]?.label}</strong>
          </>
        ) : currentStep === 4 ? (
          <span style={{ color: '#475569' }}>Final step — almost done!</span>
        ) : (
          <span style={{ color: '#10B981', fontWeight: 600 }}>Your clinic is all set up!</span>
        )}
      </div>
    </div>
  )
}

/** Reusable form section title with left blue accent bar (matches mockup) */
export function FormSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: 'Plus Jakarta Sans, Inter, sans-serif',
        fontSize: 13,
        fontWeight: 700,
        color: '#475569',
        marginBottom: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <span
        style={{
          flex: '0 0 3px',
          height: 14,
          background: '#0A6EFF',
          borderRadius: 2,
          display: 'block',
        }}
      />
      {children}
    </div>
  )
}
