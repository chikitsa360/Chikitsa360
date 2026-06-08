'use client'

import * as React from 'react'

interface WhatsAppPendingBannerProps {
  show: boolean
}

export function WhatsAppPendingBanner({ show }: WhatsAppPendingBannerProps) {
  if (!show) return null

  return (
    <div
      className="flex items-center justify-between gap-3 px-6 py-2.5"
      style={{ background: 'rgba(245,158,11,0.1)', borderBottom: '1px solid rgba(245,158,11,0.2)' }}
    >
      <div className="flex items-center gap-2 text-[13px]" style={{ color: '#D97706' }}>
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        <span className="font-medium">
          Complete your WhatsApp setup to enable patient bookings.
        </span>
      </div>
      <a
        href="/settings/whatsapp"
        className="shrink-0 text-[13px] font-semibold underline"
        style={{ color: '#D97706' }}
      >
        Connect WhatsApp →
      </a>
    </div>
  )
}
