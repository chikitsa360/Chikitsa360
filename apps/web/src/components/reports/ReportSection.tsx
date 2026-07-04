'use client'

import { ReactNode } from 'react'
import { cn } from '@chikitsa360/core'

interface ReportSectionProps {
  title: string
  action?: ReactNode
  children: ReactNode
  className?: string
  icon?: ReactNode
}

export default function ReportSection({ title, action, children, className, icon }: ReportSectionProps) {
  return (
    <div className={cn('bg-card border border-border rounded-xl mb-4', className)}>
      <div className="flex items-center px-5 py-3.5 border-b border-border">
        {icon && (
          <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center mr-2.5 text-muted-foreground flex-shrink-0">
            {icon}
          </div>
        )}
        <h2 className="font-semibold text-sm text-foreground">{title}</h2>
        {action && <div className="ml-auto">{action}</div>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}
