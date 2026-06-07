import * as React from 'react'
import { cn } from '@chikitsa360/core'

export interface StatCardProps {
  label: string
  value: string | number
  /** Optional previous value to compute trend */
  previousValue?: number
  /** Override auto-computed trend */
  trend?: 'up' | 'down' | 'neutral'
  trendLabel?: string
  icon?: React.ReactNode
  /** Accent color variant */
  variant?: 'primary' | 'teal' | 'success' | 'warning' | 'error' | 'neutral'
  className?: string
}

const variantStyles: Record<NonNullable<StatCardProps['variant']>, string> = {
  primary: 'bg-primary/10 text-primary border-primary/20',
  teal:    'bg-[rgb(0_176_155/0.1)] text-[rgb(0_140_124)] border-[rgb(0_176_155/0.2)]',
  success: 'bg-green-50 text-green-700 border-green-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  error:   'bg-red-50 text-red-700 border-red-200',
  neutral: 'bg-muted text-muted-foreground border-border',
}

function TrendArrow({ trend, label }: { trend: 'up' | 'down' | 'neutral'; label?: string }) {
  if (trend === 'neutral') return null
  const isUp = trend === 'up'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-medium',
        isUp ? 'text-green-600' : 'text-red-500'
      )}
    >
      <svg
        viewBox="0 0 12 12"
        className={cn('h-3 w-3', !isUp && 'rotate-180')}
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M6 1l5 5H7v5H5V6H1z" />
      </svg>
      {label}
    </span>
  )
}

export function StatCard({
  label,
  value,
  previousValue,
  trend,
  trendLabel,
  icon,
  variant = 'primary',
  className,
}: StatCardProps) {
  const computedTrend: 'up' | 'down' | 'neutral' =
    trend ??
    (previousValue !== undefined && typeof value === 'number'
      ? value > previousValue
        ? 'up'
        : value < previousValue
        ? 'down'
        : 'neutral'
      : 'neutral')

  const computedTrendLabel =
    trendLabel ??
    (previousValue !== undefined && typeof value === 'number' && previousValue !== 0
      ? `${Math.abs(Math.round(((value - previousValue) / previousValue) * 100))}%`
      : undefined)

  return (
    <div
      className={cn(
        'rounded-[--radius] border bg-background p-5 shadow-sm',
        'flex flex-col gap-3',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {icon && (
          <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg border', variantStyles[variant])}>
            {icon}
          </span>
        )}
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className="text-3xl font-bold tracking-tight text-foreground">{value}</span>
        {computedTrend !== 'neutral' && (
          <TrendArrow trend={computedTrend} label={computedTrendLabel} />
        )}
      </div>
    </div>
  )
}
