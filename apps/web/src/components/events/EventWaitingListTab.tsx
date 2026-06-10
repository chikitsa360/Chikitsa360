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

interface Props {
  waitingList: WaitingEntry[]
  loading?: boolean
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

export function EventWaitingListTab({ waitingList, loading }: Props) {
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
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase text-[11px] tracking-wide">#</th>
            <th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase text-[11px] tracking-wide">Name</th>
            <th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase text-[11px] tracking-wide">Phone</th>
            <th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase text-[11px] tracking-wide">Joined At</th>
            <th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase text-[11px] tracking-wide">Status</th>
          </tr>
        </thead>
        <tbody>
          {waitingList.map((entry, i) => {
            const cfg = STATUS_CONFIG[entry.status] ?? STATUS_CONFIG.waiting!
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
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
