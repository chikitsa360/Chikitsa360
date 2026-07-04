'use client'

import * as React from 'react'
import type { Doctor } from '@/app/(dashboard)/appointments/CalendarClient'
import { useToast } from '@/components/ui/ToastProvider'

interface BlockSlotFormProps {
  clinicId: string
  doctors: Doctor[]
  defaultDate: string
  defaultStartTime?: string
  defaultEndTime?: string
  onClose: () => void
  onBlocked: () => void
}

/**
 * Block slot form (Story 5.4, UX-DR18).
 * Supports one-time, daily, and weekly recurrence.
 */
export function BlockSlotForm({
  clinicId: _clinicId,
  doctors,
  defaultDate,
  defaultStartTime,
  defaultEndTime,
  onClose,
  onBlocked,
}: BlockSlotFormProps) {
  const { addToast } = useToast()
  const [doctorId, setDoctorId] = React.useState<string>('all')
  const [date, setDate] = React.useState(defaultDate)
  const [startTime, setStartTime] = React.useState(defaultStartTime ?? '09:00')
  const [endTime, setEndTime] = React.useState(defaultEndTime ?? '10:00')
  const [reason, setReason] = React.useState('')
  const [recurrence, setRecurrence] = React.useState<'none' | 'daily' | 'weekly'>('none')
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (endTime <= startTime) { setError('End time must be after start time.'); return }

    setSubmitting(true)
    setError('')

    const res = await fetch('/api/v1/slot-blocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doctorId: doctorId === 'all' ? null : doctorId,
        date,
        startTime,
        endTime,
        reason: reason.trim() || undefined,
        recurrence,
      }),
    })

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      const msg = data.error ?? 'Failed to block slot.'
      setError(msg)
      addToast({ variant: 'error', message: msg })
      setSubmitting(false)
      return
    }

    addToast({ variant: 'success', message: 'Slot blocked successfully' })
    onBlocked()
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/30" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-label="Block Slot"
        className="fixed left-1/2 top-1/2 z-[55] w-full max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-card shadow-2xl border border-border"
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2 flex-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            <span className="text-[16px] font-semibold text-foreground">Block Slot</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">×</button>
        </div>

        <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4">
          {/* Doctor selector */}
          <div>
            <label className="block text-[13px] font-medium text-muted-foreground mb-1">Doctor</label>
            <div className="relative">
              <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              <select
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
              <option value="all">All Doctors</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-[13px] font-medium text-muted-foreground mb-1">Date</label>
            <div className="relative">
              <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
              </svg>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Time range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-medium text-muted-foreground mb-1">Start Time</label>
              <div className="relative">
                <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                </svg>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  step="900"
                  required
                  className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-muted-foreground mb-1">End Time</label>
              <div className="relative">
                <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                </svg>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  step="900"
                  required
                  className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-[13px] font-medium text-muted-foreground mb-1">
              Reason <span className="text-muted-foreground/60 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
              </svg>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Lunch, CME, Emergency"
                maxLength={200}
                className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Recurrence */}
          <div>
            <label className="block text-[13px] font-medium text-muted-foreground mb-1">Recurrence</label>
            <div className="flex gap-2">
              {(['none', 'daily', 'weekly'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRecurrence(r)}
                  className={`flex-1 h-9 rounded-lg border text-[12px] font-medium transition-colors ${
                    recurrence === r
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {r === 'none' ? 'One-time' : r === 'daily' ? 'Daily' : `Weekly`}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-[12px] text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-10 rounded-lg bg-primary text-[14px] font-semibold text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Blocking…' : 'Block Slot'}
          </button>
        </form>
      </div>
    </>
  )
}
