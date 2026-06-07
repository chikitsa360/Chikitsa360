'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Input, Button } from '@chikitsa360/ui'
import { phoneSchema } from '@chikitsa360/core'

interface LoginFormProps {
  onSuccess: (phone: string, nonce: string) => void
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const t = useTranslations('auth')
  const [phone, setPhone] = React.useState('')
  const [error, setError] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const parsed = phoneSchema.safeParse(phone)
    if (!parsed.success) {
      setError(t('login.error.invalid-phone'))
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/v1/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })

      const data = await res.json()

      if (!res.ok) {
        const code = data?.error?.code
        if (code === 'OTP_LOCKED') {
          const mins = extractMinutes(data.error.message)
          setError(t('login.error.locked', { minutes: String(mins) }))
        } else {
          setError(t('login.error.generic'))
        }
        return
      }

      onSuccess(phone, data.data.nonce)
    } catch {
      setError(t('login.error.generic'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('login.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('login.subtitle')}</p>
      </div>

      <Input
        label={t('login.phone.label')}
        type="tel"
        inputMode="tel"
        placeholder={t('login.phone.placeholder')}
        value={phone}
        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
        error={error}
        required
        autoFocus
        autoComplete="tel"
        className="min-h-[44px]"
      />

      <Button
        type="submit"
        className="w-full min-h-[44px]"
        isLoading={loading}
        disabled={loading}
      >
        {loading ? t('login.sending') : t('login.send-otp')}
      </Button>
    </form>
  )
}

function extractMinutes(message: string): number {
  const match = message.match(/(\d+)\s*minute/)
  return match ? parseInt(match[1]!, 10) : 15
}
