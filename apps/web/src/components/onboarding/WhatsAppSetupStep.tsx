'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { WhatsAppStatusIndicator } from './WhatsAppStatusIndicator'

interface WhatsAppSetupStepProps {
  facebookAppId?: string
}

declare global {
  interface Window {
    FB?: {
      init: (config: object) => void
      login: (callback: (response: { authResponse?: { accessToken: string } }) => void, opts: object) => void
    }
    fbAsyncInit?: () => void
  }
}

export function WhatsAppSetupStep({ facebookAppId }: WhatsAppSetupStepProps) {
  const t = useTranslations('onboarding')
  const router = useRouter()

  const [connecting, setConnecting] = React.useState(false)
  const [connected, setConnected] = React.useState(false)
  const [error, setError] = React.useState('')
  const [completedSteps, setCompletedSteps] = React.useState(0)
  const fbInitialized = React.useRef(false)

  // Load Meta SDK
  React.useEffect(() => {
    if (!facebookAppId || fbInitialized.current) return
    fbInitialized.current = true

    window.fbAsyncInit = () => {
      window.FB?.init({
        appId: facebookAppId,
        autoLogAppEvents: true,
        xfbml: true,
        version: 'v19.0',
      })
    }

    const script = document.createElement('script')
    script.src = 'https://connect.facebook.net/en_US/sdk.js'
    script.async = true
    script.defer = true
    document.head.appendChild(script)
  }, [facebookAppId])

  async function handleConnect() {
    if (!window.FB) {
      setError('Meta SDK not loaded. Please refresh and try again.')
      return
    }

    setConnecting(true)
    setError('')

    window.FB.login(
      async (response) => {
        if (!response.authResponse?.accessToken) {
          setConnecting(false)
          setError('WhatsApp setup was cancelled or failed. Please try again.')
          return
        }

        // In a real flow, Meta would return wabaId + phoneNumberId through the embedded signup flow.
        // Here we pass the access token to the server to complete registration.
        // The actual WABA ID and Phone Number ID come from the Meta signup event data.
        // For now we store what we have and allow the server to process.
        try {
          const res = await fetch('/api/v1/clinics/whatsapp/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              wabaId: 'pending', // Will be populated by Meta webhook
              phoneNumberId: 'pending',
              accessToken: response.authResponse.accessToken,
            }),
          })

          if (!res.ok) {
            const data = await res.json()
            setError(data.error ?? 'Connection failed. Please try again.')
            return
          }

          setConnected(true)
          setCompletedSteps(1)
        } catch {
          setError('Network error. Please check your connection and try again.')
        } finally {
          setConnecting(false)
        }
      },
      {
        scope: 'whatsapp_business_management,whatsapp_business_messaging',
        extras: {
          feature: 'whatsapp_embedded_signup',
          setup: {},
        },
      }
    )
  }

  async function handleSkip() {
    // Mark onboarding complete and go directly to dashboard
    try {
      await fetch('/api/v1/clinics/complete-onboarding', { method: 'POST' })
    } catch {
      // non-fatal — still navigate to dashboard
    }
    router.push('/dashboard')
  }

  return (
    <div>
      {/* WhatsApp status indicator */}
      <div className="mb-8">
        <WhatsAppStatusIndicator completedSteps={completedSteps} />
      </div>

      {/* Description */}
      <p className="mb-6 text-center text-[14px] text-muted-foreground">
        Patients will book appointments and receive reminders on your clinic&apos;s WhatsApp number.
      </p>

      {/* Connected state */}
      {connected ? (
        <div
          className="mb-6 rounded-xl border border-success/30 px-5 py-4 text-center"
          style={{ background: 'rgba(16,185,129,0.06)' }}
        >
          <div className="mb-1 flex items-center justify-center gap-2 text-[15px] font-semibold text-success">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
            WhatsApp Connected!
          </div>
          <p className="text-[13px] text-muted-foreground">
            Your clinic number is now ready for patient bookings.
          </p>
          <button
            onClick={handleSkip}
            className="mt-4 flex h-11 w-full items-center justify-center rounded-lg bg-primary text-[14px] font-semibold text-white transition-colors hover:bg-primary/90"
          >
            Continue
          </button>
        </div>
      ) : (
        <>
          {/* Error state */}
          {error && (
            <div
              className="mb-4 rounded-xl border border-warning/30 px-4 py-3"
              style={{ background: 'rgba(245,158,11,0.06)', color: '#D97706' }}
            >
              <p className="text-[13px] font-medium">{error}</p>
              <button
                onClick={() => setError('')}
                className="mt-1.5 text-[12px] underline"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Connect button */}
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="mb-3 flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-primary text-[14px] font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {connecting ? (
              <span>Completing WhatsApp setup... Don&apos;t close this window.</span>
            ) : (
              <>
                {/* WhatsApp icon */}
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                {t('step4.connect-cta')}
              </>
            )}
          </button>

          {/* Skip */}
          <button
            onClick={handleSkip}
            className="flex h-11 w-full items-center justify-center text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {t('step4.skip')} — You can complete this in Settings → WhatsApp later.
          </button>
        </>
      )}
    </div>
  )
}
