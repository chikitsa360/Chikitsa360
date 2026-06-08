'use client'

import { ReactNode } from 'react'

interface ReportSectionProps {
  title: string
  action?: ReactNode
  children: ReactNode
  className?: string
}

export default function ReportSection({ title, action, children, className = '' }: ReportSectionProps) {
  return (
    <div className={`bg-white border border-[var(--color-border)] rounded-xl mb-4 ${className}`}>
      <div className="flex items-center px-5 py-3.5 border-b border-[var(--color-border)]">
        <h2 className="font-semibold text-sm text-[var(--color-text)]">{title}</h2>
        {action && <div className="ml-auto">{action}</div>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}
