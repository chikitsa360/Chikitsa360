'use client'

import * as React from 'react'
import { useAppointmentUpdates } from '@/lib/pusher/useAppointmentUpdates'
import { useDashboard } from '@/hooks/useDashboard'
import { useDashboardWeekly } from '@/hooks/useDashboardWeekly'
import { StatCard } from '@/components/dashboard/StatCard'
import { PatientBreakdownChips } from '@/components/dashboard/PatientBreakdownChips'
import { UpcomingFeed } from '@/components/dashboard/UpcomingFeed'
import { RevenueCard } from '@/components/dashboard/RevenueCard'
import { WeeklyToggle } from '@/components/dashboard/WeeklyToggle'
import type { DashboardTodayData } from '@/app/api/v1/dashboard/today/route'

interface DashboardClientProps {
  initial: DashboardTodayData
  clinicId: string
}

export function DashboardClient({ initial, clinicId }: DashboardClientProps) {
  const { data, refresh: refreshToday } = useDashboard(initial)
  const { data: weekData, load: loadWeek, refresh: refreshWeek } = useDashboardWeekly()
  const [view, setView] = React.useState<'today' | 'week'>('today')

  // Switch to week view and load data
  const handleViewChange = React.useCallback(async (v: 'today' | 'week') => {
    setView(v)
    if (v === 'week' && !weekData) {
      await loadWeek()
    }
  }, [weekData, loadWeek])

  // Pusher real-time: refresh all data on any appointment event
  const handleUpdate = React.useCallback(() => {
    void refreshToday()
    if (view === 'week') void refreshWeek()
  }, [refreshToday, refreshWeek, view])

  useAppointmentUpdates(clinicId, {
    onAppointmentCreated:  handleUpdate,
    onAppointmentUpdated:  handleUpdate,
    onAppointmentCancelled: handleUpdate,
  })

  const d = data

  // Resolved display values (today or week)
  const total     = view === 'week' ? (weekData?.total     ?? 0) : d.total
  const completed = view === 'week' ? (weekData?.completed ?? 0) : d.completed
  const remaining = view === 'week' ? null : d.remaining
  const noShows   = view === 'week' ? (weekData?.noShows   ?? 0) : d.noShows
  const noShowPct = view === 'week' ? weekData?.noShowPct  : null
  const revenue   = view === 'week' ? (weekData?.revenue   ?? null) : d.revenue
  const pending   = view === 'week' ? (weekData?.pending   ?? 0) : d.pending
  const newPts    = view === 'week' ? (weekData?.newPatients ?? 0) : d.newPatients
  const returning = view === 'week' ? (weekData?.returning  ?? 0) : d.returning

  return (
    <div>
      {/* Page header row: greeting is in RSC; toggle here */}
      <div className="mb-5 flex items-center justify-end">
        <WeeklyToggle view={view} onChange={(v) => { void handleViewChange(v) }} />
      </div>

      {/* Stat cards — 2×2 on mobile, 4-col on desktop */}
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Today"
          value={total}
          sub={view === 'week' ? 'this week' : undefined}
          iconBg="rgba(10,110,255,0.08)"
          iconColor="#0A6EFF"
          borderAccent="var(--color-primary, #0A6EFF)"
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          }
        />
        <StatCard
          label="Completed"
          value={completed}
          iconBg="rgba(16,185,129,0.08)"
          iconColor="#10B981"
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        {view === 'today' ? (
          <StatCard
            label="Remaining"
            value={remaining ?? 0}
            iconBg="rgba(139,92,246,0.08)"
            iconColor="#8B5CF6"
            valueColor="#8B5CF6"
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            }
          />
        ) : (
          <RevenueCard revenue={revenue} pending={pending} weekMode />
        )}
        <StatCard
          label="No-Shows"
          value={noShows}
          sub={noShowPct ? `(${noShowPct} of total)` : undefined}
          iconBg={noShows > 0 ? 'rgba(245,158,11,0.08)' : 'rgba(100,116,139,0.06)'}
          iconColor={noShows > 0 ? '#F59E0B' : '#94A3B8'}
          borderAccent={noShows > 0 ? 'var(--color-warning, #F59E0B)' : undefined}
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          }
        />
      </div>

      {/* Revenue card row (today view only — week view shows it in the grid) */}
      {view === 'today' && (
        <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-4">
          <RevenueCard revenue={revenue} pending={pending} />
          {/* Patients breakdown spans remaining columns */}
          <div className="lg:col-span-3 flex items-center rounded-xl border border-border bg-card px-5 py-4 gap-3">
            <span className="text-[13px] font-medium text-muted-foreground">Patients Today:</span>
            <PatientBreakdownChips newPatients={newPts} returning={returning} />
          </div>
        </div>
      )}

      {/* Week view: patients breakdown */}
      {view === 'week' && (
        <div className="mb-4 flex items-center rounded-xl border border-border bg-card px-5 py-4 gap-3">
          <span className="text-[13px] font-medium text-muted-foreground">Patients This Week:</span>
          <PatientBreakdownChips newPatients={newPts} returning={returning} />
        </div>
      )}

      {/* Upcoming feed (always shows today's next 5 — not affected by week toggle) */}
      <UpcomingFeed appointments={d.upcoming} />
    </div>
  )
}
