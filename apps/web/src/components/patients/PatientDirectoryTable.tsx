'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@chikitsa360/core'

export interface PatientRow {
  id: string
  name: string
  phone: string
  dob: string | null
  gender: string | null
  booking_source: string
  created_at: string
  last_visit_date: string | null
  last_doctor_name: string | null
  visit_count?: string
  whatsapp_opt_out_at?: string | null
}

interface PatientDirectoryTableProps {
  patients: PatientRow[]
  query?: string
  emptyState?: React.ReactNode
}

const AVATAR_COLORS = [
  'bg-secondary',
  'bg-primary',
  'bg-violet-500',
  'bg-orange-400',
]

function avatarColor(name: string): string {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length
  return AVATAR_COLORS[idx] ?? 'bg-primary'
}

function initials(name: string): string {
  return name.split(' ').map((p) => p[0] ?? '').join('').toUpperCase().slice(0, 2)
}

function maskPhone(phone: string): string {
  if (phone.length < 4) return phone
  return `+91 ${phone.slice(0, -4).replace(/./g, '•')}${phone.slice(-4)}`
}

function formatLastVisit(dateStr: string | null): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query || query.length < 3) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx < 0) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-100 text-yellow-800 rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

export function PatientDirectoryTable({ patients, query, emptyState }: PatientDirectoryTableProps) {
  if (patients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        {emptyState ?? (
          <p className="text-[13px] text-muted-foreground">
            {query
              ? `No patients found for "${query}".`
              : 'No patients yet. Patients are created automatically when they book via WhatsApp or Web, or you can add one manually.'}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-muted">
            <th className="h-10 px-4 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground border-b border-border">
              Patient
            </th>
            <th className="h-10 px-4 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground border-b border-border">
              Phone
            </th>
            <th className="h-10 px-4 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground border-b border-border">
              Last Visit
            </th>
            <th className="h-10 px-4 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground border-b border-border">
              Doctor
            </th>
            <th className="h-10 px-4 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground border-b border-border">
              Visits
            </th>
            <th className="h-10 w-20 border-b border-border" />
          </tr>
        </thead>
        <tbody>
          {patients.map((p) => (
            <tr key={p.id} className="group hover:bg-muted/60 transition-colors">
              <td className="h-[52px] px-4 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white',
                    avatarColor(p.name)
                  )}>
                    {initials(p.name)}
                  </div>
                  <div>
                    <div className="text-[13px] font-medium text-foreground">
                      {highlightMatch(p.name, query ?? '')}
                    </div>
                    {p.gender && (
                      <div className="text-[11px] text-muted-foreground capitalize">{p.gender}</div>
                    )}
                  </div>
                </div>
              </td>
              <td className="h-[52px] px-4 border-b border-border">
                <span className="font-mono text-[13px] tabular-nums text-muted-foreground">
                  {maskPhone(p.phone)}
                </span>
              </td>
              <td className="h-[52px] px-4 border-b border-border">
                <span className="inline-flex items-center h-5 rounded-full bg-muted px-2 text-[11px] font-medium text-muted-foreground">
                  {formatLastVisit(p.last_visit_date)}
                </span>
              </td>
              <td className="h-[52px] px-4 border-b border-border">
                {p.last_doctor_name ? (
                  <span className="inline-flex items-center h-5 rounded-full bg-primary/7 px-2 text-[11px] font-medium text-primary">
                    {p.last_doctor_name}
                  </span>
                ) : (
                  <span className="text-[13px] text-muted-foreground">—</span>
                )}
              </td>
              <td className="h-[52px] px-4 border-b border-border">
                <span className="inline-flex h-[22px] min-w-[24px] items-center justify-center rounded-full bg-muted px-1.5 text-[12px] font-semibold text-muted-foreground">
                  {p.visit_count ?? '0'}
                </span>
              </td>
              <td className="h-[52px] px-4 border-b border-border">
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link
                    href={`/patients/${p.id}`}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    title="View profile"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
