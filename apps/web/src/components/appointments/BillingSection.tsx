'use client'

import * as React from 'react'
import { useUpdateBilling } from '@/hooks/useUpdateBilling'

interface BillingSectionProps {
  appointmentId: string
  status: string
  initialFee: number | null
  initialPaymentStatus: 'paid' | 'unpaid'
  /** Default fee from doctor settings — used as pre-fill when initialFee is null */
  doctorDefaultFee: number | null
  onSaved?: (fee: number | null, paymentStatus: 'paid' | 'unpaid') => void
}

export function BillingSection({
  appointmentId,
  status,
  initialFee,
  initialPaymentStatus,
  doctorDefaultFee,
  onSaved,
}: BillingSectionProps) {
  const isCancelled = status === 'cancelled'

  // Pre-fill: if no fee saved yet, show doctor's default (but treat as "dirty")
  const prefillFee = initialFee !== null ? initialFee : doctorDefaultFee

  const [fee, setFee] = React.useState<string>(prefillFee !== null ? String(prefillFee) : '')
  const [paymentStatus, setPaymentStatus] = React.useState<'paid' | 'unpaid'>(initialPaymentStatus)
  const [successFlash, setSuccessFlash] = React.useState(false)

  const { update, saving, error, clearError } = useUpdateBilling(appointmentId)

  // A change is "dirty" if it differs from the last saved values in DB
  // Pre-fill (from default_fee) counts as dirty since DB has NULL
  const savedFeeStr = initialFee !== null ? String(initialFee) : ''
  const isDirty = fee !== savedFeeStr || paymentStatus !== initialPaymentStatus

  function handleFeeInput(e: React.ChangeEvent<HTMLInputElement>) {
    clearError()
    // Allow only digits; strip leading zeros (except single "0")
    const raw = e.target.value.replace(/[^0-9]/g, '')
    // Enforce max 99999
    const num = parseInt(raw, 10)
    if (raw === '' || num <= 99999) {
      setFee(raw)
    }
  }

  async function handleSave() {
    const feeNum = fee === '' ? null : parseInt(fee, 10)
    // If fee cleared and status was paid, auto-revert to unpaid
    const effectiveStatus = feeNum === null && paymentStatus === 'paid' ? 'unpaid' : paymentStatus

    const result = await update({ consultation_fee: feeNum, payment_status: effectiveStatus })
    if (result) {
      if (effectiveStatus !== paymentStatus) setPaymentStatus(effectiveStatus)
      setSuccessFlash(true)
      setTimeout(() => setSuccessFlash(false), 1000)
      onSaved?.(result.consultation_fee, result.payment_status)
    }
  }

  if (isCancelled) {
    return (
      <div className="border-t border-border pt-4">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Billing
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-muted-foreground">
            {initialFee !== null ? `₹${initialFee}` : 'No fee recorded'}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
              initialPaymentStatus === 'paid'
                ? 'bg-green-50 text-green-700'
                : 'bg-amber-50 text-amber-700'
            }`}
          >
            {initialPaymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
          </span>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground italic">
          Cancelled appointments cannot be billed.
        </p>
      </div>
    )
  }

  return (
    <div className="border-t border-border pt-4">
      {/* Section header */}
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Billing
      </div>

      {/* Fee input */}
      <div className="mb-3">
        <div
          className={`flex h-10 items-center overflow-hidden rounded-lg border transition-colors ${
            successFlash
              ? 'border-green-500'
              : 'border-border focus-within:border-primary'
          }`}
        >
          <span className="flex h-full items-center border-r border-border bg-muted px-2.5 text-[13px] text-muted-foreground select-none">
            ₹
          </span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={fee}
            onChange={handleFeeInput}
            placeholder="Enter amount"
            className="h-full flex-1 bg-transparent px-3 text-[13px] text-foreground focus:outline-none"
          />
        </div>
      </div>

      {/* Payment status toggle */}
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => { setPaymentStatus('unpaid'); clearError() }}
          className={`flex-1 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors ${
            paymentStatus === 'unpaid'
              ? 'bg-amber-100 text-amber-700'
              : 'border border-border bg-card text-muted-foreground hover:bg-muted'
          }`}
        >
          Unpaid
        </button>
        <button
          type="button"
          onClick={() => { setPaymentStatus('paid'); clearError() }}
          className={`flex-1 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors ${
            paymentStatus === 'paid'
              ? 'bg-primary text-white'
              : 'border border-border bg-card text-muted-foreground hover:bg-muted'
          }`}
        >
          Paid
        </button>
      </div>

      {/* Error */}
      {error && (
        <p className="mb-2 text-[12px] text-red-600">{error}</p>
      )}

      {/* Save button — only shown when dirty */}
      {isDirty && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="h-9 rounded-lg bg-primary px-4 text-[13px] font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}
    </div>
  )
}
