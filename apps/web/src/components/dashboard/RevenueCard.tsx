'use client'

import * as React from 'react'
import { useAnimatedCounter } from '@/hooks/useAnimatedCounter'

interface RevenueCardProps {
  revenue: number | null
  pending: number
  weekMode?: boolean
}

export function RevenueCard({ revenue, pending, weekMode = false }: RevenueCardProps) {
  const displayAmount = revenue ?? 0
  const { animKey } = useAnimatedCounter(displayAmount)

  return (
    <div className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-shadow duration-150">
      <div className="flex items-start justify-between" style={{ marginBottom: 12 }}>
        <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          {weekMode ? 'Revenue This Week' : 'Revenue Today'}
        </div>
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
          style={{ background: 'rgba(16,185,129,0.08)', color: '#10B981' }}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
          </svg>
        </div>
      </div>

      {revenue === null ? (
        <div key={animKey} className="font-bold leading-none tracking-tight" style={{ fontSize: 32, marginBottom: 8, color: 'var(--color-neutral-300, #CBD5E1)', fontVariantNumeric: 'tabular-nums' }}>
          <span style={{ fontSize: 24, color: '#94A3B8' }}>₹</span>—
        </div>
      ) : (
        <div key={animKey} className="font-bold leading-none tracking-tight stat-number-animate" style={{ fontSize: 32, marginBottom: 8, fontVariantNumeric: 'tabular-nums' }}>
          <span style={{ fontSize: 24, color: '#94A3B8' }}>₹</span>
          {revenue.toLocaleString('en-IN')}
        </div>
      )}

      <div className="text-[13px] text-muted-foreground">
        {revenue === null ? (
          <span className="italic text-[12px]">Record consultation fees to track revenue.</span>
        ) : (
          <>
            <span style={{ color: pending > 0 ? '#D97706' : undefined }}>
              {pending}
            </span>{' '}
            pending collection
          </>
        )}
      </div>
    </div>
  )
}
