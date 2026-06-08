'use client'

import * as React from 'react'
import { cn } from '@chikitsa360/core'

interface PatientHeaderProps {
  name: string
  phone: string
  dob: string | null
  gender: string | null
  visitCount: number
  lastVisitDate: string | null
  onBookAppointment?: () => void
}

function initials(name: string): string {
  return name.split(' ').map((p) => p[0] ?? '').join('').toUpperCase().slice(0, 2)
}

function maskPhone(phone: string): string {
  if (phone.length < 4) return phone
  return `+91 ${phone.slice(0, -4).replace(/./g, '•')}${phone.slice(-4)}`
}

const AVATAR_COLORS = ['bg-secondary', 'bg-primary', 'bg-violet-500', 'bg-orange-400']

function avatarColor(name: string): string {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length
  return AVATAR_COLORS[idx] ?? 'bg-primary'
}

export function PatientHeader({
  name, phone, dob, gender, visitCount, lastVisitDate, onBookAppointment,
}: PatientHeaderProps) {
  const age = dob ? Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : null
  const lastVisit = lastVisitDate
    ? new Date(lastVisitDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : null

  return (
    <div className="flex items-start gap-4">
      {/* Avatar */}
      <div className={cn(
        'flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-[22px] font-semibold text-white',
        avatarColor(name)
      )}>
        {initials(name)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-[22px] font-bold text-foreground leading-tight tracking-tight">{name}</div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
          {age !== null && gender && (
            <span>{gender.charAt(0).toUpperCase() + gender.slice(1)}, {age} yrs</span>
          )}
          {age !== null && gender && <span className="h-1 w-1 rounded-full bg-border" />}
          <span className="rounded border border-border bg-muted px-2 py-0.5 font-mono tabular-nums">
            {maskPhone(phone)}
          </span>
        </div>
      </div>

      {/* Stats + CTA */}
      <div className="shrink-0 flex flex-col items-end gap-2">
        <div className="flex gap-2">
          <div className="rounded-md border border-border bg-muted px-3 py-1.5 text-center">
            <div className="text-[18px] font-bold text-foreground leading-none">{visitCount}</div>
            <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Visits</div>
          </div>
          {lastVisit && (
            <div className="rounded-md border border-border bg-muted px-3 py-1.5 text-center">
              <div className="text-[14px] font-bold text-foreground leading-none">{lastVisit}</div>
              <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Last Visit</div>
            </div>
          )}
        </div>
        {onBookAppointment && (
          <button
            onClick={onBookAppointment}
            className="h-9 rounded-md bg-primary px-4 text-[13px] font-medium text-white hover:bg-primary/90 transition-colors"
          >
            + Book Appointment
          </button>
        )}
      </div>
    </div>
  )
}
