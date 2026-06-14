'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Input, Button } from '@chikitsa360/ui'
import { cn } from '@chikitsa360/core'

interface OtpFormProps {
  phone: string
  nonce: string
  last4?: string
  onChangeNumber: () => void
}

const RESEND_COOLDOWN_SECONDS = 30

export function OtpForm({ phone, nonce: initialNonce, last4, onChangeNumber }: OtpFormProps) {
  const t = useTranslations('auth')
  const router = useRouter()

  const [otp, setOtp] = React.useState('')
  const [nonce, setNonce] = React.useState(initialNonce)
  const [error, setError] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [resendCooldown, setResendCooldown] = React.useState(RESEND_COOLDOWN_SECONDS)

  // Countdown timer for resend
  React.useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => setResendCooldown((v) => v - 1), 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length !== 6) return

    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        phone,
        otp,
        nonce,
        redirect: false,
      })

      if (result?.error) {
        setError(t('login.error.invalid-otp', { remaining: '2' }))
        setOtp('')
        return
      }

      // Redirect based on session (onboarding check handled server-side)
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError(t('login.error.generic'))
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setError('')
    try {
      const res = await fetch('/api/v1/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const data = await res.json()
      if (res.ok) {
        setNonce(data.data.nonce)
        setResendCooldown(RESEND_COOLDOWN_SECONDS)
        setOtp('')
      } else {
        setError(t('login.error.generic'))
      }
    } catch {
      setError(t('login.error.generic'))
    }
  }

  const devOtp = process.env.NODE_ENV === 'development' ? '123456' : null

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('login.otp.label')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('login.otp-sent', { last4: last4 ?? phone.slice(-4) })}
        </p>
      </div>

      {devOtp && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <span className="font-semibold">Dev mode</span> — use OTP{' '}
          <code className="font-mono font-bold tracking-widest">{devOtp}</code>
        </div>
      )}

      <Input
        label={t('login.otp.label')}
        type="text"
        inputMode="numeric"
        placeholder={t('login.otp.placeholder')}
        value={otp}
        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
        maxLength={6}
        autoComplete="one-time-code"
        error={error}
        required
        autoFocus
        className={cn('text-center tracking-[0.5em] text-xl font-mono min-h-[44px]')}
      />

      <Button
        type="submit"
        className="w-full min-h-[44px]"
        isLoading={loading}
        disabled={loading || otp.length !== 6}
      >
        {loading ? t('login.verifying') : t('login.verify')}
      </Button>

      {/* Resend + change number */}
      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={onChangeNumber}
          className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
        >
          {t('login.change-number')}
        </button>

        {resendCooldown > 0 ? (
          <span className="text-muted-foreground">
            {t('login.otp-resend-in', { seconds: String(resendCooldown) })}
          </span>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            className="text-primary hover:text-primary/80 font-medium"
          >
            {t('login.otp-resend')}
          </button>
        )}
      </div>
    </form>
  )
}
