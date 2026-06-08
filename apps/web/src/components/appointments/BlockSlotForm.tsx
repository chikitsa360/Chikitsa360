'use client'

import * as React from 'react'
import type { Doctor } from '@/app/(dashboard)/appointments/CalendarClient'

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
  clinicId,
  doctors,
  defaultDate,
  defaultStartTime,
  defaultEndTime,
  onClose,
  onBlocked,
}: BlockSlotFormProps) {
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
      setError(data.error ?? 'Failed to block slot.')
      setSubmitting(false)
      return
    }

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
            <select
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-card px-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="all">All Doctors</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-[13px] font-medium text-muted-foreground mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="h-10 w-full rounded-lg border border-border bg-card px-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Time range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-medium text-muted-foreground mb-1">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                step="900"
                required
                className="h-10 w-full rounded-lg border border-border bg-card px-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-muted-foreground mb-1">End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                step="900"
                required
                className="h-10 w-full rounded-lg border border-border bg-card px-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-[13px] font-medium text-muted-foreground mb-1">
              Reason <span className="text-muted-foreground/60 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Lunch, CME, Emergency"
              maxLength={200}
              className="h-10 w-full rounded-lg border border-border bg-card px-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
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
