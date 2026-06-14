'use client'

import * as React from 'react'
import { getPlanStatus } from '@/lib/plan/check-plan'

export type PlanStatus = 'active' | 'expiring_soon' | 'expired'

interface PlanBannerProps {
  status: PlanStatus
  expiresAt?: string | null // ISO string
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function PlanBanner({ status: initialStatus, expiresAt }: PlanBannerProps) {
  // Re-check client-side every minute so the banner transitions in real-time
  // without a page reload (complements the X-Plan-Status header, AC14)
  const [status, setStatus] = React.useState<PlanStatus>(initialStatus)

  React.useEffect(() => {
    if (!expiresAt) return
    const check = () => setStatus(getPlanStatus(new Date(expiresAt)))
    const id = setInterval(check, 60_000)
    return () => clearInterval(id)
  }, [expiresAt])

  if (status === 'active') return null

  const isExpired = status === 'expired'

  return (
    <div
      className="flex h-12 items-center justify-between gap-3 px-6"
      style={
        isExpired
          ? { background: 'rgb(254 242 242)', borderBottom: '1px solid rgb(254 202 202)', color: 'rgb(153 27 27)' }
          : { background: 'rgb(255 251 235)', borderBottom: '1px solid rgb(253 230 138)', color: 'rgb(146 64 14)' }
      }
    >
      <div className="flex items-center gap-2 text-[13px] font-medium">
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        {isExpired
          ? 'Your subscription has expired. New bookings are paused.'
          : expiresAt
            ? `Your subscription expires on ${formatDate(expiresAt)}. Renew to avoid service interruption.`
            : 'Your subscription is expiring soon.'}
      </div>
      <a
        href="/settings/billing"
        className="shrink-0 rounded px-3 py-1 text-[12px] font-semibold text-white"
        style={isExpired ? { background: 'rgb(220 38 38)' } : { background: 'rgb(217 119 6)' }}
      >
        {isExpired ? 'Renew Now →' : 'Renew →'}
      </a>
    </div>
  )
}
