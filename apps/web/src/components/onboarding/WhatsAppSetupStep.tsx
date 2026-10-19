'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { NotifyConnectPanel } from '@/components/whatsapp/NotifyConnectPanel'
import { WhatsAppStatusIndicator } from './WhatsAppStatusIndicator'

interface WhatsAppSetupStepProps {
  /** Notify platform's Meta App ID (NEXT_PUBLIC_NOTIFY_META_APP_ID) */
  notifyMetaAppId?: string
  /** Notify's Embedded Signup configuration id (NEXT_PUBLIC_NOTIFY_ES_CONFIG_ID) */
  notifyEsConfigId?: string
}

export function WhatsAppSetupStep({ notifyMetaAppId, notifyEsConfigId }: WhatsAppSetupStepProps) {
  const t = useTranslations('onboarding')
  const router = useRouter()
  const [connected, setConnected] = React.useState(false)

  async function handleContinue() {
    // Mark onboarding complete and go to dashboard
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
        <WhatsAppStatusIndicator completedSteps={connected ? 1 : 0} />
      </div>

      {/* Description */}
      <p className="mb-6 text-center text-[14px] text-muted-foreground">
        Patients will book appointments and receive reminders on your clinic&apos;s WhatsApp number.
      </p>

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
            onClick={handleContinue}
            className="mt-4 flex h-11 w-full items-center justify-center rounded-lg bg-primary text-[14px] font-semibold text-white transition-colors hover:bg-primary/90"
          >
            Continue
          </button>
        </div>
      ) : (
        <>
          <NotifyConnectPanel
            metaAppId={notifyMetaAppId}
            esConfigId={notifyEsConfigId}
            onConnected={() => setConnected(true)}
          />

          {/* Skip */}
          <button
            onClick={handleContinue}
            className="flex h-11 w-full items-center justify-center rounded-lg border border-border text-[13px] font-medium text-foreground transition-colors hover:bg-muted"
          >
            {t('step4.skip')} — Set up WhatsApp later
          </button>
        </>
      )}
    </div>
  )
}
