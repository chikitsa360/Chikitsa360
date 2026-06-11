'use client'

import * as React from 'react'

interface ClinicRow {
  id: string
  name: string
  slug: string
  plan: string
  planExpiresAt: string | null
  doctorLimit: number
  doctorCount: number
  planStatus: 'active' | 'expiring_soon' | 'expired'
  ownerName: string | null
  ownerPhone: string | null
  createdAt: string
}

interface ClinicTableProps {
  clinics: ClinicRow[]
  selectedId: string | null
  onSelect: (clinic: ClinicRow) => void
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  expiring_soon: 'Expiring',
  expired: 'Expired',
}

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  expiring_soon: 'bg-amber-100 text-amber-800',
  expired: 'bg-red-100 text-red-800',
}

const ROW_BG: Record<string, string> = {
  active: '',
  expiring_soon: 'bg-amber-50',
  expired: 'bg-red-50',
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  })
}

export function ClinicTable({ clinics, selectedId, onSelect }: ClinicTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full text-left text-[13px]">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="px-4 py-3 font-medium text-muted-foreground">Clinic</th>
            <th className="px-4 py-3 font-medium text-muted-foreground">Owner</th>
            <th className="px-4 py-3 font-medium text-muted-foreground">Plan</th>
            <th className="px-4 py-3 font-medium text-muted-foreground">Expires</th>
            <th className="px-4 py-3 font-medium text-muted-foreground">Doctors</th>
            <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {clinics.map((c) => (
            <tr
              key={c.id}
              onClick={() => onSelect(c)}
              className={`cursor-pointer hover:bg-muted/20 ${ROW_BG[c.planStatus]} ${selectedId === c.id ? 'ring-2 ring-inset ring-primary/30' : ''}`}
            >
              <td className="px-4 py-3">
                <p className="font-medium text-foreground">{c.name}</p>
                <p className="text-[11px] text-muted-foreground">{c.slug}</p>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{c.ownerName ?? c.ownerPhone ?? '—'}</td>
              <td className="px-4 py-3 capitalize text-foreground">{c.plan.toLowerCase()}</td>
              <td className="px-4 py-3 text-muted-foreground">{formatDate(c.planExpiresAt)}</td>
              <td className="px-4 py-3 text-muted-foreground">{c.doctorCount} / {c.doctorLimit}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[c.planStatus]}`}>
                  {STATUS_LABELS[c.planStatus]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
