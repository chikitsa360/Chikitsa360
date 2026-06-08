'use client'

import * as React from 'react'
import { cn } from '@chikitsa360/core'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { BottomTabBar } from './BottomTabBar'
import { GlobalSearch } from '@/components/search/GlobalSearch'

interface DashboardShellProps {
  children: React.ReactNode
  clinicName?: string
  userName?: string
  userRole?: string
  whatsAppBanner?: React.ReactNode
}

export function DashboardShell({
  children,
  clinicName,
  userName,
  userRole,
  whatsAppBanner,
}: DashboardShellProps) {
  const [searchOpen, setSearchOpen] = React.useState(false)

  // Cmd+K / Ctrl+K keyboard shortcut
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Global search modal */}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Left sidebar — desktop only */}
      <Sidebar
        userRole={userRole}
        userName={userName}
        clinicName={clinicName}
        onSearchClick={() => setSearchOpen(true)}
      />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top header */}
        <Header userName={userName} userRole={userRole} />
        {/* WhatsApp pending banner */}
        {whatsAppBanner}

        {/* Page content */}
        <main
          className={cn(
            'flex-1 overflow-y-auto',
            'px-4 py-6 lg:px-8',
            // Padding bottom for mobile tab bar
            'pb-20 lg:pb-6'
          )}
        >
          {children}
        </main>
      </div>

      {/* Bottom tab bar — mobile only */}
      <BottomTabBar />
    </div>
  )
}
