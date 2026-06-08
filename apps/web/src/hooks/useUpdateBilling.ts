'use client'

import * as React from 'react'

export interface BillingUpdate {
  consultation_fee: number | null
  payment_status: 'paid' | 'unpaid'
}

export interface BillingResult {
  ok: boolean
  consultation_fee: number | null
  payment_status: 'paid' | 'unpaid'
  toast: string
}

export function useUpdateBilling(appointmentId: string) {
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const update = React.useCallback(
    async (data: BillingUpdate): Promise<BillingResult | null> => {
      setSaving(true)
      setError(null)
      try {
        const res = await fetch(`/api/v1/appointments/${appointmentId}/billing`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string }
          setError(body.error ?? 'Failed to save billing.')
          return null
        }
        return (await res.json()) as BillingResult
      } catch {
        setError('Network error. Please try again.')
        return null
      } finally {
        setSaving(false)
      }
    },
    [appointmentId]
  )

  return { update, saving, error, clearError: () => setError(null) }
}
