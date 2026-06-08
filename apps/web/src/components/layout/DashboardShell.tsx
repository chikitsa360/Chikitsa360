'use client'

import * as React from 'react'
import { cn } from '@chikitsa360/core'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { BottomTabBar } from './BottomTabBar'

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
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left sidebar — desktop only */}
      <Sidebar userRole={userRole} userName={userName} clinicName={clinicName} />

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
