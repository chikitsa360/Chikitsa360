'use client'

import * as React from 'react'
import { useAnimatedCounter } from '@/hooks/useAnimatedCounter'

interface StatCardProps {
  label: string
  value: number
  sub?: React.ReactNode
  iconBg: string
  iconColor: string
  valueColor?: string
  borderAccent?: string
  icon: React.ReactNode
}

export function StatCard({
  label,
  value,
  sub,
  iconBg,
  iconColor,
  valueColor,
  borderAccent,
  icon,
}: StatCardProps) {
  const { animKey } = useAnimatedCounter(value)

  return (
    <div
      className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-shadow duration-150"
      style={borderAccent ? { borderLeft: `3px solid ${borderAccent}` } : undefined}
    >
      <div className="flex items-start justify-between" style={{ marginBottom: 12 }}>
        <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          {label}
        </div>
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
          style={{ background: iconBg, color: iconColor }}
        >
          {icon}
        </div>
      </div>
      <div
        key={animKey}
        className="font-bold leading-none tracking-tight stat-number-animate"
        style={{
          fontSize: 32,
          color: valueColor ?? 'var(--color-foreground)',
          marginBottom: 8,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
      {sub && <div className="text-[12px] text-muted-foreground">{sub}</div>}
    </div>
  )
}
