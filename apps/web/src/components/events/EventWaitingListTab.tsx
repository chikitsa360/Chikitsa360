'use client'

import * as React from 'react'
import { cn } from '@chikitsa360/core'

interface WaitingEntry {
  id: string
  position: number
  name: string
  phone: string
  joined_at: string
  status: 'waiting' | 'promoted' | 'removed'
}

interface EventInfo {
  id: string
  max_seats: number
  seats_registered: number
}

interface Props {
  waitingList: WaitingEntry[]
  loading?: boolean
  event: EventInfo
  onRefreshEvent?: () => void
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  waiting:  { label: 'Waiting',  className: 'bg-violet-50 text-violet-700' },
  promoted: { label: 'Promoted', className: 'bg-green-50 text-green-700' },
  removed:  { label: 'Removed',  className: 'bg-muted text-muted-foreground' },
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

export function EventWaitingListTab({ waitingList: initialList, loading, event, onRefreshEvent }: Props) {
  const [waitingList, setWaitingList] = React.useState<WaitingEntry[]>(initialList)
  const [actionLoading, setActionLoading] = React.useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = React.useState<WaitingEntry | null>(null)
  const [seatsRemaining, setSeatsRemaining] = React.useState(
    Math.max(0, event.max_seats - event.seats_registered)
  )

  React.useEffect(() => {
    setWaitingList(initialList)
  }, [initialList])

  React.useEffect(() => {
    setSeatsRemaining(Math.max(0, event.max_seats - event.seats_registered))
  }, [event.max_seats, event.seats_registered])

  const handlePromote = async (entry: WaitingEntry) => {
    setActionLoading(entry.id)
    const res = await fetch(`/api/v1/events/${event.id}/waiting-list/${entry.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'promote' }),
    })
    if (res.ok) {
      setWaitingList(prev => prev.map(e => e.id === entry.id ? { ...e, status: 'promoted' } : e))
      setSeatsRemaining(prev => Math.max(0, prev - 1))
      onRefreshEvent?.()
    }
    setActionLoading(null)
  }

  const handleRemove = async (entry: WaitingEntry) => {
    setConfirmRemove(null)
    setActionLoading(entry.id)
    const res = await fetch(`/api/v1/events/${event.id}/waiting-list/${entry.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove' }),
    })
    if (res.ok) {
      setWaitingList(prev => prev.map(e => e.id === entry.id ? { ...e, status: 'removed' } : e))
    }
    setActionLoading(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-[14px] text-muted-foreground">
        Loading waiting list…
      </div>
    )
  }

  if (waitingList.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-border bg-card py-16 text-[14px] text-muted-foreground">
        No one on the waiting list
      </div>
    )
  }

  return (
    <div>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase text-[11px] tracking-wide">#</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase text-[11px] tracking-wide">Name</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase text-[11px] tracking-wide">Phone</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase text-[11px] tracking-wide">Joined At</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase text-[11px] tracking-wide">Status</th>
              <th className="px-4 py-3 text-right font-semibold text-muted-foreground uppercase text-[11px] tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {waitingList.map((entry, i) => {
              const cfg = STATUS_CONFIG[entry.status] ?? STATUS_CONFIG.waiting!
              const isWaiting = entry.status === 'waiting'
              const isRowLoading = actionLoading === entry.id
              return (
                <tr key={entry.id} className={cn('border-b border-border last:border-0', i % 2 === 0 ? '' : 'bg-muted/20')}>
                  <td className="px-4 py-3 font-bold text-muted-foreground">#{entry.position}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{entry.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{entry.phone}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(entry.joined_at)}</td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold', cfg.className)}>
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {isWaiting && (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => void handlePromote(entry)}
                          disabled={seatsRemaining <= 0 || isRowLoading}
                          title={seatsRemaining <= 0 ? 'No seats available' : 'Promote to registered'}
                          className="rounded border border-green-200 bg-green-50 px-2 py-1 text-[11px] font-semibold text-green-700 hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isRowLoading ? '…' : 'Promote'}
                        </button>
                        <button
                          onClick={() => setConfirmRemove(entry)}
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
            <h2 className="text-[16px] font-bold text-foreground">Remove from Waiting List?</h2>
            <p className="mt-2 text-[13px] text-muted-foreground">
              Remove <strong>{confirmRemove.name}</strong> from the waiting list? This cannot be undone.
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
