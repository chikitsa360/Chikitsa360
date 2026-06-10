'use client'

import * as React from 'react'
import { cn } from '@chikitsa360/core'

interface Invitation {
  id: string
  name: string
  phone: string
  sent_at: string | null
  created_at: string
  delivery_status: 'pending' | 'sent' | 'failed'
}

interface Props {
  invitations: Invitation[]
  loading?: boolean
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  sent:    { label: 'Sent',    className: 'bg-green-50 text-green-700' },
  pending: { label: 'Pending', className: 'bg-slate-100 text-slate-600' },
  failed:  { label: 'Failed',  className: 'bg-red-50 text-red-700' },
}

function formatDate(isoString: string | null): string {
  if (!isoString) return 'Pending'
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

export function EventInvitationsTab({ invitations, loading }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-[14px] text-muted-foreground">
        Loading invitations…
      </div>
    )
  }

  if (invitations.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-border bg-card py-16 text-[14px] text-muted-foreground">
        No invitations sent yet
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
            <th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase text-[11px] tracking-wide">Sent At</th>
            <th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase text-[11px] tracking-wide">Delivery Status</th>
          </tr>
        </thead>
        <tbody>
          {invitations.map((inv, i) => {
            const cfg = STATUS_CONFIG[inv.delivery_status] ?? STATUS_CONFIG.pending!
            return (
              <tr key={inv.id} className={cn('border-b border-border last:border-0', i % 2 === 0 ? '' : 'bg-muted/20')}>
                <td className="px-4 py-3 font-medium text-foreground">{inv.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{inv.phone}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(inv.sent_at)}</td>
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
