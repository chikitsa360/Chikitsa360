'use client'

import * as React from 'react'
import { cn } from '@chikitsa360/core'

interface Registration {
  id: string
  name: string
  phone: string
  registered_at: string
  reference_number: string
  status: 'registered' | 'attended' | 'no_show' | 'cancelled'
}

interface EventInfo {
  id: string
  start_time: string
  end_time: string
}

interface Props {
  registrations: Registration[]
  loading?: boolean
  event: EventInfo
  onRefreshEvent?: () => void
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  registered:  { label: 'Registered', className: 'bg-blue-50 text-blue-700' },
  attended:    { label: 'Attended',   className: 'bg-green-50 text-green-700' },
  no_show:     { label: 'No-Show',    className: 'bg-amber-50 text-amber-700' },
  cancelled:   { label: 'Cancelled',  className: 'bg-muted text-muted-foreground' },
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EventRegistrantsTab({ registrations: initialRegistrations, loading, event, onRefreshEvent }: Props) {
  const [registrations, setRegistrations] = React.useState<Registration[]>(initialRegistrations)
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [actionLoading, setActionLoading] = React.useState<string | null>(null)
  const [bulkLoading, setBulkLoading] = React.useState(false)
  const [confirmRemove, setConfirmRemove] = React.useState<Registration | null>(null)
  const [eventStarted, setEventStarted] = React.useState(
    Date.now() >= new Date(event.start_time).getTime()
  )
  const [eventActive, setEventActive] = React.useState(
    Date.now() >= new Date(event.start_time).getTime() &&
    Date.now() < new Date(event.end_time).getTime() + 86400000
  )

  // Sync registrations if parent provides fresh data
  React.useEffect(() => {
    setRegistrations(initialRegistrations)
  }, [initialRegistrations])

  // Re-evaluate time gates every 60s
  React.useEffect(() => {
    const tick = () => {
      const now = Date.now()
      const startMs = new Date(event.start_time).getTime()
      const endMs = new Date(event.end_time).getTime()
      setEventStarted(now >= startMs)
      setEventActive(now >= startMs && now < endMs + 86400000)
    }
    const id = setInterval(tick, 60000)
    return () => clearInterval(id)
  }, [event.start_time, event.end_time])

  const callAttendanceApi = async (regId: string, action: 'mark-attended' | 'mark-no-show') => {
    const res = await fetch(`/api/v1/events/${event.id}/registrations/${regId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    return res.ok
  }

  const handleMarkAttendance = async (regId: string, action: 'mark-attended' | 'mark-no-show') => {
    setActionLoading(regId)
    const newStatus = action === 'mark-attended' ? 'attended' : 'no_show'
    const ok = await callAttendanceApi(regId, action)
    if (ok) {
      setRegistrations(prev => prev.map(r => r.id === regId ? { ...r, status: newStatus as Registration['status'] } : r))
    }
    setActionLoading(null)
  }

  const handleBulkAction = async (action: 'mark-attended' | 'mark-no-show') => {
    setBulkLoading(true)
    const ids = Array.from(selectedIds)
    const newStatus = action === 'mark-attended' ? 'attended' : 'no_show'
    for (const regId of ids) {
      const ok = await callAttendanceApi(regId, action)
      if (ok) {
        setRegistrations(prev => prev.map(r => r.id === regId ? { ...r, status: newStatus as Registration['status'] } : r))
      }
    }
    setSelectedIds(new Set())
    setBulkLoading(false)
  }

  const handleRemove = async (reg: Registration) => {
    setConfirmRemove(null)
    setActionLoading(reg.id)
    const res = await fetch(`/api/v1/events/${event.id}/registrations/${reg.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove' }),
    })
    if (res.ok) {
      setRegistrations(prev => prev.map(r => r.id === reg.id ? { ...r, status: 'cancelled' } : r))
      onRefreshEvent?.()
    }
    setActionLoading(null)
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const registeredRows = registrations.filter(r => r.status === 'registered')
  const allRegisteredSelected = registeredRows.length > 0 && registeredRows.every(r => selectedIds.has(r.id))

  const toggleSelectAll = () => {
    if (allRegisteredSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(registeredRows.map(r => r.id)))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-[14px] text-muted-foreground">
        Loading registrants…
      </div>
    )
  }

  if (registrations.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-border bg-card py-16 text-[14px] text-muted-foreground">
        No registrations yet
      </div>
    )
  }

  return (
    <div>
      {/* Attendance In Progress banner */}
      {eventActive && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-[13px] font-medium text-amber-800">
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          Event is in progress — mark attendance for each registrant
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5">
          <span className="text-[13px] font-medium text-foreground">{selectedIds.size} selected</span>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => void handleBulkAction('mark-attended')}
              disabled={bulkLoading}
              className="rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-[12px] font-semibold text-green-700 hover:bg-green-100 disabled:opacity-60"
            >
              {bulkLoading ? 'Marking…' : 'Mark All Attended'}
            </button>
            <button
              onClick={() => void handleBulkAction('mark-no-show')}
              disabled={bulkLoading}
              className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-[12px] font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-60"
            >
              {bulkLoading ? '…' : 'Mark All No-Show'}
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="rounded-md border border-border px-3 py-1.5 text-[12px] text-muted-foreground hover:bg-muted"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="w-8 px-3 py-3">
                <input
                  type="checkbox"
                  checked={allRegisteredSelected}
                  onChange={toggleSelectAll}
                  className="h-3.5 w-3.5 rounded accent-primary"
                  aria-label="Select all registered"
                />
              </th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase text-[11px] tracking-wide">Name</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase text-[11px] tracking-wide">Phone</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase text-[11px] tracking-wide">Registered At</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase text-[11px] tracking-wide">Ref Number</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase text-[11px] tracking-wide">Status</th>
              <th className="px-4 py-3 text-right font-semibold text-muted-foreground uppercase text-[11px] tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {registrations.map((reg, i) => {
              const cfg = STATUS_CONFIG[reg.status] ?? STATUS_CONFIG.registered!
              const isRegistered = reg.status === 'registered'
              const isRowLoading = actionLoading === reg.id
              return (
                <tr key={reg.id} className={cn('border-b border-border last:border-0', i % 2 === 0 ? '' : 'bg-muted/20')}>
                  <td className="px-3 py-3">
                    {isRegistered ? (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(reg.id)}
                        onChange={() => toggleSelect(reg.id)}
                        className="h-3.5 w-3.5 rounded accent-primary"
                      />
                    ) : (
                      <span />
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">{reg.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{reg.phone}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(reg.registered_at)}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-foreground">{reg.reference_number}</td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold', cfg.className)}>
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {isRegistered && (
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Attendance buttons */}
                        <button
                          onClick={() => void handleMarkAttendance(reg.id, 'mark-attended')}
                          disabled={!eventStarted || isRowLoading}
                          title={!eventStarted ? 'Attendance marking available after event starts' : undefined}
                          className="rounded border border-green-200 bg-green-50 px-2 py-1 text-[11px] font-semibold text-green-700 hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isRowLoading ? '…' : 'Attended'}
                        </button>
                        <button
                          onClick={() => void handleMarkAttendance(reg.id, 'mark-no-show')}
                          disabled={!eventStarted || isRowLoading}
                          title={!eventStarted ? 'Attendance marking available after event starts' : undefined}
                          className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isRowLoading ? '…' : 'No-Show'}
                        </button>
                        {/* Remove button */}
                        <button
                          onClick={() => setConfirmRemove(reg)}
                          disabled={isRowLoading}
                          className="rounded border border-red-200 bg-transparent px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Remove confirmation dialog */}
      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
            <h2 className="text-[16px] font-bold text-foreground">Remove Registrant?</h2>
            <p className="mt-2 text-[13px] text-muted-foreground">
              Remove <strong>{confirmRemove.name}</strong> from this event? Their seat will be freed and the next person on the waiting list will be notified.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setConfirmRemove(null)}
                className="rounded-md border border-border px-4 py-2 text-[13px] font-medium text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleRemove(confirmRemove)}
                className="rounded-md bg-red-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-red-700"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
