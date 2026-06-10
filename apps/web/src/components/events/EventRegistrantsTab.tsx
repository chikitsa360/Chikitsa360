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

interface Props {
  registrations: Registration[]
  loading?: boolean
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

export function EventRegistrantsTab({ registrations, loading }: Props) {
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
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase text-[11px] tracking-wide">Name</th>
            <th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase text-[11px] tracking-wide">Phone</th>
            <th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase text-[11px] tracking-wide">Registered At</th>
            <th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase text-[11px] tracking-wide">Ref Number</th>
            <th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase text-[11px] tracking-wide">Status</th>
          </tr>
        </thead>
        <tbody>
          {registrations.map((reg, i) => {
            const cfg = STATUS_CONFIG[reg.status] ?? STATUS_CONFIG.registered!
            return (
              <tr key={reg.id} className={cn('border-b border-border last:border-0', i % 2 === 0 ? '' : 'bg-muted/20')}>
                <td className="px-4 py-3 font-medium text-foreground">{reg.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{reg.phone}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(reg.registered_at)}</td>
                <td className="px-4 py-3 font-mono text-[12px] text-foreground">{reg.reference_number}</td>
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
