'use client'

import * as React from 'react'
import { useToast } from '@/components/ui/ToastProvider'

interface ClinicDetail {
  id: string
  name: string
  slug: string
  plan: string
  planExpiresAt: string | null
  doctorLimit: number
  doctorCount: number
  ownerName: string | null
  ownerPhone: string | null
  createdAt: string
}

interface ClinicDetailPanelProps {
  clinic: ClinicDetail
  onClose: () => void
  onSaved: (updated: { plan: string; planExpiresAt: string | null; doctorLimit: number }) => void
}

const PLAN_OPTIONS = ['TRIAL', 'STARTER', 'BASIC', 'PRO']

function toDateInput(iso: string | null): string {
  if (!iso) return ''
  return iso.slice(0, 10) // YYYY-MM-DD
}

export function ClinicDetailPanel({ clinic, onClose, onSaved }: ClinicDetailPanelProps) {
  const { addToast } = useToast()
  const [plan, setPlan] = React.useState(clinic.plan)
  const [expiryDate, setExpiryDate] = React.useState(toDateInput(clinic.planExpiresAt))
  const [doctorLimit, setDoctorLimit] = React.useState(clinic.doctorLimit)
  const [saving, setSaving] = React.useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const planExpiresAt = expiryDate ? new Date(expiryDate + 'T23:59:59Z').toISOString() : null
      const res = await fetch(`/api/admin/clinics/${clinic.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, planExpiresAt, doctorLimit }),
      })
      if (!res.ok) throw new Error('Save failed')
      addToast({ variant: 'success', message: `Plan updated for ${clinic.name}.` })
      onSaved({ plan, planExpiresAt, doctorLimit })
    } catch {
      addToast({ variant: 'error', message: 'Failed to save. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata',
    })
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-[15px] font-semibold text-foreground">{clinic.name}</h2>
        <button onClick={onClose} className="rounded p-1 hover:bg-muted">
          <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Info */}
      <div className="px-5 py-4 space-y-1 border-b border-border text-[13px]">
        <p className="text-muted-foreground">Slug: <span className="text-foreground font-mono">{clinic.slug}</span></p>
        <p className="text-muted-foreground">Owner: <span className="text-foreground">{clinic.ownerName ?? clinic.ownerPhone ?? '—'}</span></p>
        <p className="text-muted-foreground">Doctors: <span className="text-foreground">{clinic.doctorCount} active</span></p>
        <p className="text-muted-foreground">Registered: <span className="text-foreground">{formatDate(clinic.createdAt)}</span></p>
      </div>

      {/* Edit form */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        <div>
          <label className="block text-[12px] font-medium text-foreground mb-1">Plan</label>
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-[13px] outline-none focus:border-ring"
          >
            {PLAN_OPTIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[12px] font-medium text-foreground mb-1">Expiry Date</label>
          <input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-[13px] outline-none focus:border-ring"
          />
        </div>

        <div>
          <label className="block text-[12px] font-medium text-foreground mb-1">Doctor Limit</label>
          <input
            type="number"
            min={1}
            max={50}
            value={doctorLimit}
            onChange={(e) => setDoctorLimit(parseInt(e.target.value, 10) || 1)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-[13px] outline-none focus:border-ring"
          />
        </div>
      </div>

      {/* Save */}
      <div className="border-t border-border px-5 py-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-md bg-primary py-2 text-[13px] font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
