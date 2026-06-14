'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Input, Select, Button } from '@chikitsa360/ui'
import { cn } from '@chikitsa360/core'
import { inviteStaffSchema } from '@chikitsa360/core'
import { useToast } from '@/components/ui/ToastProvider'

interface InviteStaffModalProps {
  doctorLimit: number
  currentDoctorCount: number
  onClose: () => void
  onSuccess: () => void
}

export function InviteStaffModal({
  doctorLimit,
  currentDoctorCount,
  onClose,
  onSuccess,
}: InviteStaffModalProps) {
  const t = useTranslations('staff')
  const { addToast } = useToast()
  const [phone, setPhone] = React.useState('')
  const [role, setRole] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [errors, setErrors] = React.useState<{ phone?: string; role?: string }>({})

  const doctorLimitReached = currentDoctorCount >= doctorLimit

  // Close on Escape
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const parsed = inviteStaffSchema.safeParse({ phone, role })
    if (!parsed.success) {
      const fieldErrors: { phone?: string; role?: string } = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as string
        if (field === 'phone') fieldErrors.phone = issue.message
        if (field === 'role') fieldErrors.role = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/v1/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data?.error === 'doctor_limit_reached') {
          addToast({ variant: 'error', message: t('invite-limit-reached', { limit: String(doctorLimit) }) })
        } else {
          addToast({ variant: 'error', message: data?.message ?? 'Failed to send invite' })
        }
        return
      }

      addToast({ variant: 'success', message: t('invite-success', { phone }) })
      onSuccess()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-modal-title"
        className={cn(
          'relative z-10 w-full max-w-md rounded-xl bg-background p-6',
          'shadow-[var(--shadow-modal)] border border-border'
        )}
      >
        <div className="flex items-start justify-between mb-5">
          <h2 id="invite-modal-title" className="text-lg font-semibold text-foreground">
            {t('invite-title')}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {doctorLimitReached && role === 'DOCTOR' && (
          <div className="mb-4 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
            {t('invite-limit-reached', { limit: String(doctorLimit) })}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t('invite-phone-label')}
            type="tel"
            inputMode="tel"
            placeholder="Enter 10-digit mobile number"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            error={errors.phone}
            required
            autoFocus
            className="min-h-[44px]"
          />

          <Select
            label={t('invite-role-label')}
            placeholder={t('invite-role-placeholder')}
            value={role}
            onChange={(e) => setRole(e.target.value)}
            error={errors.role}
            required
            options={[
              {
                label: 'Doctor',
                value: 'DOCTOR',
                disabled: doctorLimitReached,
              },
              { label: 'Receptionist', value: 'RECEPTIONIST' },
            ]}
            className="min-h-[44px]"
          />

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              isLoading={loading}
              disabled={loading || (role === 'DOCTOR' && doctorLimitReached)}
            >
              {t('invite-submit')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
