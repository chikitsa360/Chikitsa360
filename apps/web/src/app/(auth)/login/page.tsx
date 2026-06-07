'use client'

import * as React from 'react'
import { AuthCard } from '@/components/auth/AuthCard'
import { LoginForm } from '@/components/auth/LoginForm'
import { OtpForm } from '@/components/auth/OtpForm'

type Step = 'phone' | 'otp'

interface OtpState {
  phone: string
  nonce: string
  last4: string
}

export default function LoginPage() {
  const [step, setStep] = React.useState<Step>('phone')
  const [otpState, setOtpState] = React.useState<OtpState | null>(null)

  const handlePhoneSuccess = (phone: string, nonce: string) => {
    setOtpState({ phone, nonce, last4: phone.slice(-4) })
    setStep('otp')
  }

  const handleChangeNumber = () => {
    setStep('phone')
    setOtpState(null)
  }

  return (
    <AuthCard>
      {step === 'phone' && <LoginForm onSuccess={handlePhoneSuccess} />}
      {step === 'otp' && otpState && (
        <OtpForm
          phone={otpState.phone}
          nonce={otpState.nonce}
          last4={otpState.last4}
          onChangeNumber={handleChangeNumber}
        />
      )}
    </AuthCard>
  )
}
