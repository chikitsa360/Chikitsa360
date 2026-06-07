'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@chikitsa360/core'
import { UserMenu } from './UserMenu'

// Map pathname segments → display titles
const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  appointments: 'Appointments',
  patients: 'Patients',
  doctors: 'Doctors',
  prescriptions: 'Prescriptions',
  billing: 'Billing',
  reports: 'Reports',
  settings: 'Settings',
}

function usePageTitle() {
  const pathname = usePathname()
  const segment = pathname.split('/').filter(Boolean)[0] ?? 'dashboard'
  return PAGE_TITLES[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1)
}

function useFormattedDate() {
  const [label, setLabel] = React.useState('')
  React.useEffect(() => {
    setLabel(
      new Date().toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    )
  }, [])
  return label
}

interface HeaderProps {
  userName?: string
  userRole?: string
  hasNotification?: boolean
}

export function Header({ userName, userRole, hasNotification = false }: HeaderProps) {
  const pageTitle = usePageTitle()
  const date = useFormattedDate()

  return (
    <header
      className={cn(
        'flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-6',
        'sticky top-0 z-30'
      )}
    >
      {/* Page title */}
      <div className="text-base font-bold text-foreground" style={{ letterSpacing: '-0.01em' }}>
        {pageTitle}
      </div>

      {/* Date */}
      {date && (
        <div className="hidden text-[13px] text-muted-foreground md:block">{date}</div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Notification bell */}
      <button
        className={cn(
          'relative flex h-8 w-8 items-center justify-center rounded-md border border-border',
          'text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-100',
          'focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2'
        )}
        aria-label="Notifications"
      >
        <svg className="h-[15px] w-[15px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path strokeLinecap="round" d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {hasNotification && (
          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-error border border-card" />
        )}
      </button>

      {/* Quick Add button */}
      <button
        className={cn(
          'flex items-center gap-1.5 rounded-md bg-primary px-3 h-8',
          'text-[13px] font-medium text-white',
          'hover:bg-primary/90 transition-colors duration-100',
          'focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2'
        )}
        aria-label="Quick add"
      >
        <svg className="h-[13px] w-[13px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Quick Add
      </button>

      {/* Mobile-only user menu (sidebar handles it on desktop) */}
      <div className="lg:hidden">
        <UserMenu userName={userName} userRole={userRole} />
      </div>
    </header>
  )
}
