import * as React from 'react'
import { cn } from '@chikitsa360/core'

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  label?: string
}

const sizeMap = {
  sm:  'h-4 w-4 border-2',
  md:  'h-6 w-6 border-2',
  lg:  'h-10 w-10 border-[3px]',
  xl:  'h-16 w-16 border-4',
}

export function Spinner({ size = 'md', className, label = 'Loading…' }: SpinnerProps) {
  return (
    <span role="status" aria-label={label} className={cn('inline-flex items-center justify-center', className)}>
      <span
        className={cn(
          'block animate-spin rounded-full',
          'border-border border-t-primary',
          sizeMap[size]
        )}
      />
      <span className="sr-only">{label}</span>
    </span>
  )
}

/** Full-page centered loading overlay */
export function PageSpinner({ label }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="xl" />
        {label && <p className="text-sm text-muted-foreground animate-pulse">{label}</p>}
      </div>
    </div>
  )
}
