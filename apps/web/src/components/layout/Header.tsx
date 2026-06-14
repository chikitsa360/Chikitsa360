'use client'

import * as React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@chikitsa360/core'
import { UserMenu } from './UserMenu'

// Map pathname segments → display titles
const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  appointments: 'Appointments',
  patients: 'Patients',
  doctors: 'Doctors',
  events: 'Events',
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
}

export function Header({ userName, userRole }: HeaderProps) {
  const pageTitle = usePageTitle()
  const date = useFormattedDate()
  const router = useRouter()

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

      {/* Quick Add button */}
      <button
        onClick={() => router.push('/appointments')}
        className={cn(
          'flex items-center gap-1.5 rounded-md bg-primary px-3 h-8',
          'text-[13px] font-medium text-white',
          'hover:bg-primary/90 active:bg-primary/80 transition-colors duration-100',
          'focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2'
        )}
        title="Go to appointments to add a new appointment"
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
